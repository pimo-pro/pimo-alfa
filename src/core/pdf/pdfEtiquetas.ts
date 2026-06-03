import jsPDF from "jspdf";
import qrcode from "qrcode-generator";
import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import type { SettingsSchema } from "../settings/settingsService";
import { buildGlobalQrCutlistMerged } from "../manufacturing/cutlistFromBoxes";
import { buildLocalQrPayload, generateQrCanvasWithLogo } from "../qrcode/qrcodeService";
import { resolveAuthoritativeLabelNumber } from "../qrcode/panelLabelNumber";
import {
  buildEtiquetaCodeV5,
  buildPiecesPerSheetMap,
  labelItemSheetKey,
} from "../etiquetas/qr/etiquetaCodeV5";
import type { LabelConfig } from "../labelConfig/labelConfig";
import { resolveUnifiedLabelConfig } from "../etiquetas/config/unifiedLabelConfig";
import { normalizeCutLayoutPlacements } from "../etiquetas/engine/nestingAdapter";
import { formatDimensionV5, formatNumberV5 } from "./labelMeasuresV5";
import {
  collectObservationsForItem,
  observationsToV5Slots,
  type LabelObservationRulesLike,
} from "./labelObservationsV5";
import { drawLogoPiInBox, loadLogoPiDataUrl } from "./logoPiPublic";
import { buildCutLayoutProPartName } from "../cutlayout/cutLayoutProPieceNaming";
import { DEFAULT_LABEL_CONFIG } from "../labelConfig/labelConfig";
import {
  computePieceSequence,
  type PieceData,
  type PieceOrlaConfigInput,
  type PieceProductionKind,
  type PieceProductionSequence,
} from "../labelConfig/labelSequenceEngine";
import type {
  LabelDesignerConfig,
  LabelTextElement,
  LabelQrElement,
  LabelLogoElement,
} from "../labelDesigner/labelDesignerTypes";

const BRAND_RED_ETI: [number, number, number] = [139, 0, 0];

/** Posição de uma peça no layout de corte (usada para ordenar etiquetas por chapa). */
type SheetPlacement = {
  partName: string;
  boxId: string;
  sheetIndex: number;
  x_mm: number;
  y_mm: number;
};

export type ProjectForEtiquetasPdf = {
  projectName: string;
  boxes: BoxModule[];
  rules: RulesConfig;
  materialId?: string;
  extractedPartsByBoxId?: Record<string, Record<string, CutListItemComPreco[]>>;
  settings?: SettingsSchema;
  /** Posições das peças no nesting final; se fornecidas, ordena etiquetas por chapa. */
  cutLayoutPlacements?: SheetPlacement[];
  /** Config do designer de etiquetas; se presente, substitui o renderer de rules.etiqueta. */
  designerConfig?: LabelDesignerConfig;
  /** Itens pré-calculados (útil para exportação multi-projeto; skip getCutlistWithMetadata). */
  precomputedItems?: CutListItemComPreco[];
  /** Orla V1 por panelId — opcional para renderer v5. */
  orlaPiecesByPanelId?: Record<string, PieceOrlaConfigInput>;
};

type LabelItem = CutListItemComPreco & {
  boxNome?: string;
  pieceName?: string;
  /** Nome do projeto de origem da peça (fabricação em massa). */
  sourceProjectName?: string;
  /** Total de peças na folha/caixa (NUM_CAIXA) — uso interno v5 / futuro tracking. */
  numCaixa?: number;
  /** Observações ligadas à peça/etiqueta (máx. 3 para v5). */
  observations?: string[];
};

/** Nome industrial alinhado ao Layout de Corte PRO (`<prefixoCaixa>_<prefixoPeca>`). */
function nomeIndustrialParaEtiqueta(item: LabelItem, project: ProjectForEtiquetasPdf): string {
  const projectName = item.sourceProjectName ?? project.projectName;
  const boxNome = item.boxNome;
  return buildCutLayoutProPartName(item, boxNome, projectName);
}

/** Código gravado no QR / texto da etiqueta — alinhado a `resolveAuthoritativeLabelNumber` + shortCode literal. */
function resolveEtiquetaCodeParaEtiqueta(
  item: LabelItem,
  ctx: { projectName: string; boxes: BoxModule[]; rules: RulesConfig }
): string {
  const authoritative = resolveAuthoritativeLabelNumber(item);
  if (authoritative != null) {
    return buildLocalQrPayload(item, ctx, authoritative);
  }
  const rawSc = String(item.shortCode ?? "").trim();
  if (rawSc && rawSc !== "ERR") {
    return rawSc;
  }
  return buildLocalQrPayload(item, ctx, 1);
}

/** Código v5 — apenas quando enableV5Layout; QR e faixa inferior usam a mesma string. */
function resolveEtiquetaCodeV5ParaEtiqueta(
  item: LabelItem,
  ctx: { projectName: string },
  piecesPerSheet: Map<string, number>,
  index0: number
): string {
  const key = labelItemSheetKey(item.boxId, item.nome);
  const totalPiecesInSheet = piecesPerSheet.get(key) ?? 0;
  const pieceSeq = resolveAuthoritativeLabelNumber(item) ?? index0 + 1;
  return buildEtiquetaCodeV5({
    projectName: ctx.projectName,
    pieceSeq,
    totalPiecesInSheet,
  });
}

function getCutlistWithMetadata(project: ProjectForEtiquetasPdf): LabelItem[] {
  const boxById = new Map(project.boxes.map((b) => [b.id, b]));

  if (project.precomputedItems) {
    return project.precomputedItems.map((p) => ({
      ...p,
      boxNome: boxById.get(p.boxId ?? "")?.nome ?? p.boxId ?? "—",
      pieceName: p.nome,
      sourceProjectName: (p as unknown as Record<string, unknown>).sourceProjectName as string | undefined,
    }));
  }

  const parametric = buildGlobalQrCutlistMerged(
    project.boxes,
    project.rules,
    project.materialId,
    project.projectName,
    project.extractedPartsByBoxId
  );
  return parametric.map((p) => ({
    ...p,
    boxNome: boxById.get(p.boxId ?? "")?.nome ?? p.boxId ?? "—",
    pieceName: p.nome,
  }));
}

/**
 * Ordena as etiquetas pela posição real das peças nas chapas do nesting.
 * Ordem: chapa → base para topo (y decrescente) → direita para esquerda (x crescente em TRO).
 * Peças sem correspondência no nesting ficam no fim.
 */
function orderByCutLayoutPro(items: LabelItem[], placements?: SheetPlacement[]): LabelItem[] {
  if (!placements || placements.length === 0) return items;

  const lookup = new Map<string, { sheetIndex: number; x_mm: number; y_mm: number }>();
  for (const p of placements) {
    const key = `${p.boxId ?? ""}::${p.partName ?? ""}`;
    if (!lookup.has(key)) {
      lookup.set(key, { sheetIndex: p.sheetIndex, x_mm: p.x_mm, y_mm: p.y_mm });
    }
  }

  return [...items].sort((a, b) => {
    const keyA = `${a.boxId ?? ""}::${a.nome ?? ""}`;
    const keyB = `${b.boxId ?? ""}::${b.nome ?? ""}`;
    const infoA = lookup.get(keyA);
    const infoB = lookup.get(keyB);
    if (!infoA && !infoB) return 0;
    if (!infoA) return 1;
    if (!infoB) return -1;
    if (infoA.sheetIndex !== infoB.sheetIndex) return infoA.sheetIndex - infoB.sheetIndex;
    const yDiff = infoB.y_mm - infoA.y_mm; // y maior = base da chapa = primeiro
    if (Math.abs(yDiff) > 1) return yDiff;
    return infoA.x_mm - infoB.x_mm; // x menor em TRO = lado direito = primeiro
  });
}

function drawQrFromCode(doc: jsPDF, code: string, x: number, y: number, size: number) {
  const qr = qrcode(0, "M");
  qr.addData(code);
  qr.make();
  const count = qr.getModuleCount();
  const moduleSize = size / Math.max(1, count);
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(0, 0, 0);
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!qr.isDark(r, c)) continue;
      doc.rect(x + c * moduleSize, y + r * moduleSize, moduleSize, moduleSize, "F");
    }
  }
}

async function drawQrWithLogoOrFallback(
  doc: jsPDF,
  code: string,
  x: number,
  y: number,
  size: number,
  settings?: SettingsSchema
) {
  if (!settings?.etiquetasQr?.logoAtivado || !settings?.etiquetasQr?.logoDataUrl) {
    drawQrFromCode(doc, code, x, y, size);
    return;
  }

  try {
    const canvas = await generateQrCanvasWithLogo(code, size * 10, {
      logoDataUrl: settings.etiquetasQr.logoDataUrl,
      logoSizePercent: settings.etiquetasQr.logoTamanhoPorcento,
    });
    const imgData = canvas.toDataURL("image/png");
    doc.addImage(imgData, "PNG", x, y, size, size);
  } catch {
    drawQrFromCode(doc, code, x, y, size);
  }
}

/** Renderer usando a configuração visual do Etiqueta Designer com dados reais da peça. */
async function renderEtiquetaPageFromDesignerConfig(
  doc: jsPDF,
  item: LabelItem,
  project: ProjectForEtiquetasPdf,
  cfg: LabelDesignerConfig,
): Promise<void> {
  const w = cfg.widthMm;
  const h = cfg.heightMm;

  doc.setFillColor(cfg.backgroundColor || "#ffffff");
  doc.rect(0, 0, w, h, "F");

  if ((cfg.borderWidthMm ?? 0) > 0) {
    doc.setDrawColor(cfg.borderColor || "#888888");
    doc.setLineWidth(cfg.borderWidthMm);
    const r = cfg.borderRadiusMm ?? 0;
    if (r > 0) {
      doc.roundedRect(0.5, 0.5, w - 1, h - 1, r, r, "S");
    } else {
      doc.rect(0.5, 0.5, w - 1, h - 1, "S");
    }
  }

  const effectiveProjectName = item.sourceProjectName ?? project.projectName;
  const etiquetaCode = resolveEtiquetaCodeParaEtiqueta(item, {
    projectName: effectiveProjectName,
    boxes: project.boxes,
    rules: project.rules,
  });

  const larg = Math.round(item.dimensoes?.largura ?? 0);
  const alt  = Math.round(item.dimensoes?.altura ?? 0);
  const esp  = Math.round(item.espessura ?? 0);

  const nomeIndustrial = nomeIndustrialParaEtiqueta(item, project);

  const dataMap: Record<string, string> = {
    projeto:     effectiveProjectName || "PROJETO",
    caixa:       item.boxNome ?? item.boxId ?? "—",
    peca:        nomeIndustrial,
    madeira:     (item.material ?? "—").toUpperCase(),
    medidas:     `${larg}×${alt}×${esp} mm`,
    numero_peca: etiquetaCode,
  };

  const padT = cfg.marginTopMm ?? 2;
  const padL = cfg.marginLeftMm ?? 2;

  for (const el of cfg.elements) {
    if (!el.visible) continue;
    const x = padL + el.x;
    const y = padT + el.y;

    if (el.type === "qr") {
      await drawQrWithLogoOrFallback(
        doc,
        etiquetaCode,
        x,
        y,
        (el as LabelQrElement).qrSizeMm,
        project.settings,
      );
    } else if (el.type === "logo") {
      const logoUrl = (el as LabelLogoElement).logoDataUrl || cfg.logoDataUrl;
      if (logoUrl) {
        try {
          const fmt = logoUrl.startsWith("data:image/svg")
            ? "SVG"
            : logoUrl.includes("jpeg") || logoUrl.includes("jpg")
            ? "JPEG"
            : "PNG";
          doc.addImage(logoUrl, fmt, x, y, el.width, el.height);
        } catch { /* logo error não interrompe a geração da etiqueta */ }
      }
    } else {
      const tEl = el as LabelTextElement;
      const text = dataMap[el.type] ?? "";
      if (!text) continue;
      doc.setFont(tEl.fontFamily ?? "Helvetica", tEl.fontWeight === "bold" ? "bold" : "normal");
      doc.setFontSize(tEl.fontSize);
      const hex = (tEl.color ?? "#111111").replace("#", "").padEnd(6, "0");
      doc.setTextColor(
        parseInt(hex.slice(0, 2), 16) || 0,
        parseInt(hex.slice(2, 4), 16) || 0,
        parseInt(hex.slice(4, 6), 16) || 0,
      );
      const lines = doc.splitTextToSize(text, el.width);
      doc.text(lines, x, y + tEl.fontSize * 0.35);
    }
  }
}

async function renderEtiquetaPage(
  doc: jsPDF,
  item: LabelItem,
  project: ProjectForEtiquetasPdf,
  logoDataUrl: string | null
) {
  const cfg = project.rules.etiqueta;
  const width = cfg.larguraMm;
  const height = cfg.alturaMm;
  const margin = cfg.margemInternaMm;
  const borderMm = Math.max(0.1, cfg.bordaPx * 0.264583);
  const qrSize = Math.max(12, cfg.tamanhoQr);
  const bodySize = Math.max(6, cfg.tamanhoTexto);

  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(borderMm);
  doc.rect(0.5, 0.5, width - 1, height - 1);

  const logoSizeMm = Math.min(7, Math.max(4, Math.min(width * 0.2, height * 0.14)));
  const logoX = margin;
  const logoY = margin + 0.5;
  drawLogoPiInBox(doc, logoDataUrl, logoX, logoY, logoSizeMm, BRAND_RED_ETI);

  const effectiveProjectName = item.sourceProjectName ?? project.projectName;
  const ref = `${effectiveProjectName || "PROJETO"}_${item.boxNome ?? item.boxId ?? "BOX"}_${item.pieceName ?? item.nome}`;
  const refX = logoX + logoSizeMm + 2;
  const refMaxW = Math.max(8, width - refX - margin);

  doc.setTextColor(10, 10, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  let headerBottom = logoY + logoSizeMm;
  if (cfg.mostrarReferencia) {
    const refLines = doc.splitTextToSize(ref.toUpperCase(), refMaxW);
    doc.text(refLines.slice(0, 2), refX, logoY + 3.2);
    headerBottom = Math.max(headerBottom, logoY + Math.min(refLines.length, 2) * 3.6 + 1);
  }

  const y = headerBottom + 2;
  const qrX = margin;
  const qrY = y + 1.5;
  const etiquetaCode = resolveEtiquetaCodeParaEtiqueta(item, {
    projectName: effectiveProjectName,
    boxes: project.boxes,
    rules: project.rules,
  });

  await drawQrWithLogoOrFallback(doc, etiquetaCode, qrX, qrY, qrSize, project.settings);

  if (project.rules.qrcode.mostrarTextoAbaixoQr) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(bodySize + 1);
    doc.text(etiquetaCode, qrX, qrY + qrSize + 4.2);
  }

  let rightY = qrY + 1;
  const rightX = qrX + qrSize + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(bodySize);
  const nomeIndustrial = nomeIndustrialParaEtiqueta(item, project);
  doc.setFont("helvetica", "bold");
  doc.text(nomeIndustrial, rightX, rightY);
  rightY += 4.2;
  doc.setFont("helvetica", "normal");
  if (cfg.mostrarMaterial) {
    doc.text(`MAT: ${(item.material ?? "-").toUpperCase()}`, rightX, rightY);
    rightY += 4.2;
  }
  if (cfg.mostrarDimensoes) {
    doc.text(
      `LxAxE: ${Math.round(item.dimensoes.largura)}x${Math.round(item.dimensoes.altura)}x${Math.round(item.espessura)}`,
      rightX,
      rightY
    );
    rightY += 4.2;
  }
  if (project.rules.qrcode.destacarNumeroPeca) {
    doc.setFont("helvetica", "bold");
    doc.text(etiquetaCode, rightX, rightY);
  }
}

// ============================================================================
// Renderer v5 — layout FINAL (98×60 mm, faixa inferior, grelha produção)
// ============================================================================

/** px CSS @96dpi → mm (maqueta PIMO_LABEL_DESIGN_PREVIEW). */
function v5Px(px: number): number {
  return (px / 96) * 25.4;
}

/** px CSS → pontos jsPDF (≈ font-size em px). */
function v5Pt(px: number): number {
  return px * 0.75;
}

const V5_PAD_MM = v5Px(8);
const V5_BORDER_MM = v5Px(2);
const V5_TEXT: [number, number, number] = [17, 17, 17];
const V5_MUTED: [number, number, number] = [102, 102, 102];
const V5_LINE_LIGHT: [number, number, number] = [221, 221, 221];
const V5_LINE_CUT: [number, number, number] = [68, 68, 68];
const V5_INFO_GAP_MM = v5Px(12);
const V5_LABEL_COL_MM = v5Px(26);
const V5_SEQ_BOX_MM = v5Px(21);
const V5_OBS_LABEL_W_MM = v5Px(14);

function mapPaletteGroupToAAA(group: string): string {
  const g = String(group ?? "").trim().toUpperCase();
  if (g.length >= 3) return g.slice(0, 3);
  if (g.length === 2) return `${g[0]}${g[1]}${g[0]}`;
  if (g.length === 1) return g.repeat(3);
  return "---";
}

function formatDrillDistancesGridV5(seq: PieceProductionSequence): string {
  if (!seq.drillDistances || seq.drillDistances.every((d) => d <= 0)) return "– – – –";
  return seq.drillDistances.map((d) => (d > 0 ? String(Math.round(d)) : "–")).join("  ");
}

function formatOrlarSidesGridV5(sides: PieceProductionSequence["orlarSides"]): string {
  const flags = [sides.front, sides.back, sides.right, sides.left];
  return flags.map((f) => (f ? "S" : "N")).join("  ");
}

/** Medidas v5 na etiqueta: largura × altura (sem espessura; ~5 espaços visuais). */
function formatMedidasLabelV5(widthMm: number, heightMm: number): string {
  const w = formatNumberV5(widthMm);
  const h = formatNumberV5(heightMm);
  return `${w}     ×     ${h} MM`;
}

function fmtStepNum(n: number | null): string {
  return n != null ? String(n) : "—";
}

function panelIdFromItemMetadata(metadata?: Record<string, unknown>): string | null {
  if (!metadata || typeof metadata.panelId !== "string") return null;
  const s = metadata.panelId.trim();
  return s || null;
}

function inferPieceKind(item: LabelItem): PieceProductionKind {
  const tipo = String(item.tipo ?? "").toLowerCase();
  const nome = String(item.pieceName ?? item.nome ?? "").toUpperCase();
  if (nome.includes("LED") && nome.includes("LATERAL")) return "LATERAIS_COM_LED";
  if (nome.includes("SENSOR") && nome.includes("FUNDO")) return "FUNDO_COM_SENSOR";
  if (tipo === "cima" || nome.includes("CIMA") || nome.includes("TOPO")) return "CIMA";
  if (tipo === "fundo" || nome === "FUNDO" || nome.includes("FUNDO")) return "FUNDO";
  if (tipo === "prateleira" || nome.includes("PRATELEIRA")) return "PRATELEIRA";
  if (tipo === "gaveta_frente" || nome.includes("GAVETA_FRENTE") || nome.includes("GAV_FREN")) return "FRENTE_GAVETA";
  if (tipo === "gaveta_lat_esq" || tipo === "gaveta_lat_dir" || nome.includes("GAV_LAT")) return "GAV_LATERAIS";
  if (tipo === "gaveta_traseira" || nome.includes("GAV_TRA")) return "GAV_TRAS";
  if (tipo.includes("lateral") || nome.includes("LATERAL") || nome.includes("LAT_")) return "LATERAL";
  if (nome.includes("REMATE")) return "REMATE";
  if (nome.includes("RODAPE") || nome.includes("RODAP")) return "RODAPE";
  return "GENERIC";
}

function labelItemToPieceData(item: LabelItem, project: ProjectForEtiquetasPdf): PieceData {
  const panelId = panelIdFromItemMetadata(item.metadata);
  const orlaPieceConfig =
    panelId && project.orlaPiecesByPanelId?.[panelId]
      ? project.orlaPiecesByPanelId[panelId]
      : undefined;
  return {
    name: item.pieceName ?? item.nome ?? "peca",
    kind: inferPieceKind(item),
    thicknessMm: item.espessura ?? 0,
    hasDrillFile: Boolean(item.drillHoles?.length),
    orlaPieceConfig,
    drillHoles: item.drillHoles?.map((h) => ({ x: h.x, y: h.y })),
    widthMm: item.dimensoes?.largura,
    heightMm: item.dimensoes?.altura,
  };
}

async function drawV5_QR(
  doc: jsPDF,
  code: string,
  x: number,
  y: number,
  sizeMm: number,
  settings?: SettingsSchema
): Promise<void> {
  await drawQrWithLogoOrFallback(doc, code, x, y, sizeMm, settings);
}

function drawV5_Info(
  doc: jsPDF,
  x: number,
  yMaterial: number,
  width: number,
  material: string,
  medidas: string,
  dims: LabelConfig["dimensions"]
): number {
  const labelPt = v5Pt(8.5);
  const valuePt = v5Pt(10.5);
  const valX = x + V5_LABEL_COL_MM;
  const valueMaxW = width - V5_LABEL_COL_MM - 0.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(labelPt);
  doc.setTextColor(...V5_MUTED);
  doc.text("MATRIAL", x, yMaterial + labelPt * 0.35);

  doc.setFont("courier", "bold");
  doc.setFontSize(valuePt);
  doc.setTextColor(...V5_TEXT);
  const matLines = doc.splitTextToSize(material, valueMaxW);
  doc.text(matLines.slice(0, 2), valX, yMaterial + valuePt * 0.35);

  const yMed = yMaterial + dims.materialHeight_mm;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(labelPt);
  doc.setTextColor(...V5_MUTED);
  doc.text("MEDIDAS", x, yMed + labelPt * 0.35);

  doc.setFont("courier", "bold");
  doc.setFontSize(valuePt);
  doc.setTextColor(...V5_TEXT);
  doc.text(medidas, valX, yMed + valuePt * 0.35, { maxWidth: valueMaxW });

  return yMed + dims.medidasHeight_mm;
}

/** Referências de layout v5 legado — mantidas para compatibilidade e testes. */
export const v5EtiquetaLayoutLegacyRefs = {
  V5_PAD_MM,
  V5_BORDER_MM,
  V5_INFO_GAP_MM,
  V5_SEQ_BOX_MM,
  V5_OBS_LABEL_W_MM,
  drawV5_Info,
  formatDimensionV5,
  formatMedidasLabelV5,
};

/**
 * Célula da grelha de produção — layout horizontal: label à esquerda, caixa à direita.
 * Ambos centrados verticalmente na linha.
 */
function drawV5_SeqBox(
  doc: jsPDF,
  cellX: number,
  cellY: number,
  colW: number,
  rowH: number,
  pkLabel: string,
  stepNum: number | null
): void {
  const num = fmtStepNum(stepNum);
  const hasNum = num !== "—";

  // Caixa: alinhada à direita, centrada verticalmente
  const boxSize = Math.min(rowH - 2.2, colW * 0.40, 8);
  const boxX = cellX + colW - boxSize - 2;
  const boxY = cellY + (rowH - boxSize) / 2;

  // Label: alinhada à esquerda, centrada verticalmente
  const labelMaxW = boxX - cellX - 2.5;
  const labelPt = v5Pt(7);
  const labelY = cellY + rowH / 2 + labelPt * 0.16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(labelPt);
  doc.setTextColor(...V5_TEXT);
  // Quebra em 2 linhas se necessário (ex: EMBALAGEM)
  const labelLines = doc.splitTextToSize(pkLabel.toUpperCase(), labelMaxW);
  if (labelLines.length >= 2) {
    const lh = labelPt * 0.42;
    doc.text(String(labelLines[0]), cellX + 1.5, labelY - lh * 0.65);
    doc.text(String(labelLines[1]), cellX + 1.5, labelY + lh * 0.9);
  } else {
    doc.text(pkLabel.toUpperCase(), cellX + 1.5, labelY, { maxWidth: labelMaxW });
  }

  // Borda da caixa — contorno fino uniforme (sem preenchimento)
  doc.setDrawColor(51, 51, 51);
  doc.setLineWidth(0.15);
  doc.rect(boxX, boxY, boxSize, boxSize);

  // Número centrado na caixa
  if (hasNum) {
    const numPt = v5Pt(Math.min(11, boxSize * 2.5));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(numPt);
    doc.setTextColor(...V5_TEXT);
    doc.text(num, boxX + boxSize / 2, boxY + boxSize / 2 + numPt * 0.13, { align: "center" });
  }
}

function drawV5_GridDataLine(doc: jsPDF, cellX: number, cellY: number, colW: number, rowH: number, line: string): void {
  const pt = v5Pt(8.5);
  doc.setFont("courier", "bold");
  doc.setFontSize(pt);
  doc.setTextColor(...V5_TEXT);
  doc.text(line, cellX + colW / 2, cellY + rowH / 2 + pt * 0.13, {
    align: "center",
    maxWidth: colW - 2,
  });
}

function drawV5_ProductionGrid(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  seq: PieceProductionSequence
): void {
  const colW = width / 3;
  const rowH = height / 3;

  // Linhas internas da grelha (finas)
  doc.setDrawColor(...V5_LINE_LIGHT);
  doc.setLineWidth(0.1);
  for (let r = 1; r < 3; r++) {
    doc.line(x, y + r * rowH, x + width, y + r * rowH);
  }
  for (let c = 1; c < 3; c++) {
    doc.line(x + c * colW, y, x + c * colW, y + height);
  }
  // Borda exterior da grelha
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.12);
  doc.rect(x, y, width, height);

  // Linha 1
  drawV5_SeqBox(doc, x,            y,      colW, rowH, "NISTING",   seq.nisting);
  drawV5_SeqBox(doc, x + colW,     y,      colW, rowH, "MANUAL",    seq.manual);
  drawV5_SeqBox(doc, x + 2 * colW, y,      colW, rowH, "LIMPEZAS",  seq.limpezas);
  // Linha 2
  const y1 = y + rowH;
  drawV5_SeqBox(doc, x,            y1, colW, rowH, "DRILL",     seq.drill);
  drawV5_GridDataLine(doc, x + colW, y1, colW, rowH, formatDrillDistancesGridV5(seq));
  drawV5_SeqBox(doc, x + 2 * colW, y1, colW, rowH, "MONTAGEM",  seq.montagem);
  // Linha 3
  const y2 = y + 2 * rowH;
  drawV5_SeqBox(doc, x,            y2, colW, rowH, "ORLAR",     seq.orlar);
  drawV5_GridDataLine(doc, x + colW, y2, colW, rowH, formatOrlarSidesGridV5(seq.orlarSides));
  drawV5_SeqBox(doc, x + 2 * colW, y2, colW, rowH, "EMBALAGEM", seq.embalagem);
}

/**
 * Barra de observações — rótulo único "OBSERVAÇÃO" à esquerda (abaixo do QR);
 * textos reais na mesma linha, sem repetir o rótulo nem caixas múltiplas.
 */
function drawV5_ObservationBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  observations: [string, string, string]
): void {
  const textPt = v5Pt(7);
  const textY = y + height * 0.50 + textPt * 0.13;
  const labelW = V5_OBS_LABEL_W_MM;

  doc.setDrawColor(...V5_LINE_LIGHT);
  doc.setLineWidth(0.1);
  doc.line(x, y, x + width, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(textPt);
  doc.setTextColor(...V5_MUTED);
  doc.text("OBSERVAÇÃO", x + 0.5, textY);

  const parts = observations.map((o) => String(o ?? "").trim()).filter(Boolean);
  if (parts.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(textPt);
    doc.setTextColor(...V5_TEXT);
    doc.text(parts.join("  "), x + labelW + 1, textY, { maxWidth: width - labelW - 2 });
  }
  doc.setTextColor(...V5_TEXT);
}

function drawV5_CutLine(doc: jsPDF, y: number, width: number): void {
  doc.setDrawColor(...V5_LINE_CUT);
  doc.setLineWidth(v5Px(2.5));
  const dash = v5Px(4);
  const docDash = doc as jsPDF & { setLineDashPattern?: (a: number[], b: number) => void };
  if (typeof docDash.setLineDashPattern === "function") {
    docDash.setLineDashPattern([dash, dash * 0.6], 0);
  }
  doc.line(0, y, width, y);
  if (typeof docDash.setLineDashPattern === "function") {
    docDash.setLineDashPattern([], 0);
  }
}

/**
 * Faixa inferior — fundo branco (igual ao resto), 10 mm, delimitada por linha fina no topo.
 * Esquerda: CODIGO / AAA · Direita: PROJETO / PEÇA (texto preto).
 */
function drawV5_BottomStrip(
  doc: jsPDF,
  y: number,
  width: number,
  height: number,
  etiquetaCode: string,
  aaa: string,
  projectName: string,
  pieceName: string
): void {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, y, width, height, "F");

  doc.setDrawColor(...V5_LINE_LIGHT);
  doc.setLineWidth(0.12);
  doc.line(0, y, width, y);

  const PAD = 3;
  const centerY = y + height / 2 + v5Pt(11) * 0.12;
  const leftText = `${etiquetaCode} / ${aaa}`;
  const rightText = `${projectName} / ${pieceName}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(v5Pt(11));
  doc.setTextColor(...V5_TEXT);
  doc.text(leftText, PAD, centerY);

  const leftW = doc.getTextWidth(leftText);
  const sepX = PAD + leftW + 4;
  doc.setDrawColor(...V5_LINE_LIGHT);
  doc.setLineWidth(0.12);
  doc.line(sepX, y + 1.2, sepX, y + height - 1.2);

  const rightX = sepX + PAD;
  const rightMaxW = width - rightX - PAD;
  doc.text(rightText, rightX, centerY, { maxWidth: rightMaxW });
}

/**
 * Renderer principal v5 — layout de referência:
 * um QR v5; short code só como texto auxiliar; faixa inferior branca 10 mm;
 * OBSERVAÇÃO única à esquerda; medidas largura × altura (sem espessura).
 */
async function renderEtiquetaPageV5(
  doc: jsPDF,
  item: LabelItem,
  project: ProjectForEtiquetasPdf,
  config: LabelConfig,
  seq: PieceProductionSequence,
  piecesPerSheet: Map<string, number>,
  index0: number
): Promise<void> {
  const dims = config.dimensions;
  const w = dims.totalWidth_mm;
  const h = dims.totalHeight_mm;

  // ── Fundo branco + borda fina ────────────────────────────────────────────
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, w, h, "F");
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.2);
  doc.rect(0.25, 0.25, w - 0.5, h - 0.5);

  // ── Dados da peça ────────────────────────────────────────────────────────
  const effectiveProjectName = item.sourceProjectName ?? project.projectName;
  const etiquetaCodeV5 = resolveEtiquetaCodeV5ParaEtiqueta(
    item, { projectName: effectiveProjectName }, piecesPerSheet, index0
  );
  const legacyCode = resolveEtiquetaCodeParaEtiqueta(item, {
    projectName: effectiveProjectName, boxes: project.boxes, rules: project.rules,
  });
  const nomeIndustrial = nomeIndustrialParaEtiqueta(item, project);
  const material = (item.material ?? "—").toUpperCase();
  const medidas = formatMedidasLabelV5(
    item.dimensoes?.largura ?? 0,
    item.dimensoes?.altura ?? 0
  );
  const aaa = mapPaletteGroupToAAA(seq.paletteGroup);
  const observations = observationsToV5Slots(item.observations ?? []);

  // ── Coordenadas — calcula de baixo para cima ──────────────────────────────
  const PAD = 2.5;
  const QR_INFO_GAP = 3;
  const bottomStripMm = 10;
  const bottomY  = h - bottomStripMm;              // faixa inferior fixa 10 mm
  const cutY     = bottomY - 0.5;                    // linha de corte
  const obsY     = cutY - dims.observationHeight_mm; // barra de observações
  const contentH = obsY - PAD;                       // altura disponível para QR + info

  // Coluna da esquerda (QR)
  const qrColW = dims.qrColumnWidth_mm;
  const qrX    = PAD;

  // Coluna da direita (info)
  const infoX = PAD + qrColW + QR_INFO_GAP;
  const infoW = w - infoX - PAD;

  // ── QR único (v5) — short code apenas como texto auxiliar, nunca segundo QR ──
  const qrSize1 = Math.min(dims.qrSize_mm, contentH);
  const qrY1 = PAD;

  await drawV5_QR(doc, etiquetaCodeV5, qrX, qrY1, qrSize1, project.settings);

  const showLegacyAux =
    legacyCode.trim() !== etiquetaCodeV5.trim() &&
    legacyCode.trim() !== "" &&
    legacyCode !== "ERR";
  if (showLegacyAux) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(v5Pt(6));
    doc.setTextColor(...V5_MUTED);
    doc.text(legacyCode, qrX, qrY1 + qrSize1 + 1.2, { maxWidth: qrColW });
    doc.setTextColor(...V5_TEXT);
  }

  // ── Secção de informação ──────────────────────────────────────────────────
  const yMaterial = PAD;
  const yMedidas  = yMaterial + dims.materialHeight_mm;
  const yGrid     = yMedidas  + dims.medidasHeight_mm;
  const gridH     = obsY - yGrid;       // preenche o espaço restante

  // Rótulo "MATRIAL" + valor
  const LABEL_COL_W = 16;
  const labelPt = v5Pt(7.5);
  const valuePt = v5Pt(10);
  const valX    = infoX + LABEL_COL_W;
  const valMaxW = infoW - LABEL_COL_W - 0.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(labelPt);
  doc.setTextColor(...V5_MUTED);
  doc.text("MATRIAL", infoX, yMaterial + dims.materialHeight_mm * 0.62);

  doc.setFont("courier", "bold");
  doc.setFontSize(valuePt);
  doc.setTextColor(...V5_TEXT);
  const matLines = doc.splitTextToSize(material, valMaxW);
  doc.text(matLines.slice(0, 1) as string[], valX, yMaterial + dims.materialHeight_mm * 0.62);

  // Rótulo "MEDIDAS" + valor
  const medY = yMedidas + dims.medidasHeight_mm * 0.65;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(labelPt);
  doc.setTextColor(...V5_MUTED);
  doc.text("MEDIDAS", infoX, medY);

  doc.setFont("courier", "bold");
  doc.setFontSize(valuePt);
  doc.setTextColor(...V5_TEXT);
  doc.text(medidas, valX, medY, { maxWidth: valMaxW });

  // Linha separadora entre medidas e grelha
  doc.setDrawColor(...V5_LINE_LIGHT);
  doc.setLineWidth(0.1);
  doc.line(infoX, yGrid - 0.3, infoX + infoW, yGrid - 0.3);

  // Grelha de produção (gridH dinâmico)
  drawV5_ProductionGrid(doc, infoX, yGrid, infoW, gridH, seq);

  // ── Barra de observações (largura total) ─────────────────────────────────
  drawV5_ObservationBar(doc, PAD, obsY, w - 2 * PAD, dims.observationHeight_mm, observations);

  // ── Linha de corte ────────────────────────────────────────────────────────
  drawV5_CutLine(doc, cutY, w);

  // ── Faixa inferior ────────────────────────────────────────────────────────
  drawV5_BottomStrip(
    doc, bottomY, w, bottomStripMm,
    etiquetaCodeV5, aaa,
    effectiveProjectName || "PROJETO",
    nomeIndustrial
  );
}

/**
 * PDF de etiquetas de produção — UnifiedEtiquetaEngine (motor v5, config unificada).
 */
export async function buildProductionEtiquetasV5Pdf(
  project: ProjectForEtiquetasPdf,
  labelConfig: LabelConfig = DEFAULT_LABEL_CONFIG
): Promise<jsPDF> {
  const ordered = orderByCutLayoutPro(getCutlistWithMetadata(project), project.cutLayoutPlacements);
  const piecesPerSheet = buildPiecesPerSheetMap(ordered, project.cutLayoutPlacements);
  for (const item of ordered) {
    const key = labelItemSheetKey(item.boxId, item.nome);
    item.numCaixa = piecesPerSheet.get(key) ?? 0;
    item.observations = collectObservationsForItem(item, project.rules as LabelObservationRulesLike);
  }

  const dims = labelConfig.dimensions;
  const pageW = dims.totalWidth_mm;
  const pageH = dims.totalHeight_mm;
  const doc = new jsPDF({
    orientation: pageW >= pageH ? "landscape" : "portrait",
    unit: "mm",
    format: [pageW, pageH],
  });

  for (let idx = 0; idx < ordered.length; idx++) {
    if (idx > 0) doc.addPage([pageW, pageH], pageW >= pageH ? "landscape" : "portrait");
    const pieceData = labelItemToPieceData(ordered[idx], project);
    const seq = computePieceSequence(pieceData, labelConfig);
    await renderEtiquetaPageV5(doc, ordered[idx], project, labelConfig, seq, piecesPerSheet, idx);
  }
  return doc;
}

/**
 * Sistemas legados isolados (S1 legado, S3 designer, flag enableV5Layout).
 * Mantido para regressão — não usar em exportação de produção.
 */
export async function buildEtiquetasPdfLegacy(project: ProjectForEtiquetasPdf): Promise<jsPDF> {
  const ordered = orderByCutLayoutPro(getCutlistWithMetadata(project), project.cutLayoutPlacements);
  const piecesPerSheet = buildPiecesPerSheetMap(ordered, project.cutLayoutPlacements);
  for (const item of ordered) {
    const key = labelItemSheetKey(item.boxId, item.nome);
    item.numCaixa = piecesPerSheet.get(key) ?? 0;
    item.observations = collectObservationsForItem(item, project.rules as LabelObservationRulesLike);
  }
  const designerConfig = project.designerConfig;

  if (designerConfig && designerConfig.elements.length > 0) {
    const w = designerConfig.widthMm;
    const h = designerConfig.heightMm;
    const doc = new jsPDF({ unit: "mm", format: [w, h] });
    for (let idx = 0; idx < ordered.length; idx++) {
      if (idx > 0) doc.addPage([w, h]);
      await renderEtiquetaPageFromDesignerConfig(doc, ordered[idx], project, designerConfig);
    }
    return doc;
  }

  const cfg = project.rules.etiqueta;
  const useV5 = Boolean(cfg.enableV5Layout);
  const v5Cfg = DEFAULT_LABEL_CONFIG;
  const pageW = useV5 ? v5Cfg.dimensions.totalWidth_mm : cfg.larguraMm;
  const pageH = useV5 ? v5Cfg.dimensions.totalHeight_mm : cfg.alturaMm;

  const doc = new jsPDF({
    orientation: pageW >= pageH ? "landscape" : "portrait",
    unit: "mm",
    format: [pageW, pageH],
  });
  const logoDataUrl = useV5 ? null : await loadLogoPiDataUrl();

  for (let idx = 0; idx < ordered.length; idx++) {
    if (idx > 0) doc.addPage([pageW, pageH], pageW >= pageH ? "landscape" : "portrait");
    if (useV5) {
      const pieceData = labelItemToPieceData(ordered[idx], project);
      const seq = computePieceSequence(pieceData, v5Cfg);
      await renderEtiquetaPageV5(doc, ordered[idx], project, v5Cfg, seq, piecesPerSheet, idx);
    } else {
      await renderEtiquetaPage(doc, ordered[idx], project, logoDataUrl);
    }
  }
  return doc;
}

/** Hub público — UnifiedEtiquetaEngine (UEE): produção v5, sem designer S3. */
export async function buildEtiquetasPdf(project: ProjectForEtiquetasPdf): Promise<jsPDF> {
  const labelConfig = resolveUnifiedLabelConfig(project.rules);
  const placements = normalizeCutLayoutPlacements(project.cutLayoutPlacements);
  return buildProductionEtiquetasV5Pdf(
    { ...project, cutLayoutPlacements: placements, designerConfig: undefined },
    labelConfig
  );
}
