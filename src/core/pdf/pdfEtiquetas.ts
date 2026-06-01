import jsPDF from "jspdf";
import qrcode from "qrcode-generator";
import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import type { SettingsSchema } from "../settings/settingsService";
import { buildGlobalQrCutlistMerged } from "../manufacturing/cutlistFromBoxes";
import { buildLocalQrPayload, generateQrCanvasWithLogo } from "../qrcode/qrcodeService";
import { resolveAuthoritativeLabelNumber } from "../qrcode/panelLabelNumber";
import { drawLogoPiInBox, loadLogoPiDataUrl } from "./logoPiPublic";
import { buildCutLayoutProPartName } from "../cutlayout/cutLayoutProPieceNaming";
import { DEFAULT_LABEL_CONFIG } from "../labelConfig/labelConfig";
import type { LabelConfig } from "../labelConfig/labelConfig";
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

const V5_PAD_MM = 1;
const V5_TEXT: [number, number, number] = [0, 0, 0];
const V5_MUTED: [number, number, number] = [80, 80, 80];

function formatDimension(widthMm: number, heightMm: number, thicknessMm?: number): string {
  const w = Math.round(widthMm);
  const h = Math.round(heightMm);
  if (thicknessMm != null && thicknessMm > 0) {
    return `${w}×${h}×${Math.round(thicknessMm)}`;
  }
  return `${w}×${h}`;
}

function mapPaletteGroupToAAA(group: string): string {
  const g = String(group ?? "").trim().toUpperCase();
  if (g.length >= 3) return g.slice(0, 3);
  if (g.length === 2) return `${g[0]}${g[1]}${g[0]}`;
  if (g.length === 1) return g.repeat(3);
  return "---";
}

function formatOrlarSidesGrid(sides: PieceProductionSequence["orlarSides"]): string {
  const c = (v: boolean) => (v ? "S" : "N");
  return `${c(sides.front)} ${c(sides.back)} ${c(sides.right)} ${c(sides.left)}`;
}

function formatDrillDistancesGrid(seq: PieceProductionSequence): string {
  if (!seq.drillDistances) return "— — — —";
  return seq.drillDistances.map((d) => (d > 0 ? String(d) : "—")).join(" ");
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
  doc.setTextColor(...V5_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("MATERIAL", x, yMaterial + 3);
  doc.setFont("helvetica", "normal");
  doc.text(material, x + 18, yMaterial + 3, { maxWidth: width - 18 });

  const yMed = yMaterial + dims.materialHeight_mm;
  doc.setFont("helvetica", "bold");
  doc.text("MEDIDAS", x, yMed + 3.5);
  doc.setFont("helvetica", "normal");
  doc.text(medidas, x + 18, yMed + 3.5, { maxWidth: width - 18 });

  return yMed + dims.medidasHeight_mm;
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
  const drillStr = formatDrillDistancesGrid(seq);
  const orlarStr = formatOrlarSidesGrid(seq.orlarSides);

  const cells: { label: string; value: string }[][] = [
    [
      { label: "NISTING", value: fmtStepNum(seq.nisting) },
      { label: "MANUAL", value: fmtStepNum(seq.manual) },
      { label: "LIMPEZAS", value: fmtStepNum(seq.limpezas) },
    ],
    [
      { label: "DRILL", value: fmtStepNum(seq.drill) },
      { label: "", value: drillStr },
      { label: "MONTAGEM", value: fmtStepNum(seq.montagem) },
    ],
    [
      { label: "ORLAR", value: fmtStepNum(seq.orlar) },
      { label: "", value: orlarStr },
      { label: "EMBALAGEM", value: fmtStepNum(seq.embalagem) },
    ],
  ];

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.12);
  for (let r = 0; r <= 3; r++) {
    doc.line(x, y + r * rowH, x + width, y + r * rowH);
  }
  for (let c = 0; c <= 3; c++) {
    doc.line(x + c * colW, y, x + c * colW, y + height);
  }

  doc.setTextColor(...V5_TEXT);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = cells[r]![c]!;
      const cx = x + c * colW + 0.8;
      const cy = y + r * rowH + 2.2;
      if (cell.label) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(4.5);
        doc.text(cell.label, cx, cy);
      }
      doc.setFont("helvetica", cell.label ? "normal" : "bold");
      doc.setFontSize(cell.label ? 5.5 : 5);
      doc.text(cell.value, cx, cy + (cell.label ? 2.8 : 3.2), {
        maxWidth: colW - 1.2,
      });
    }
  }
}

function drawV5_ObservationBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  observations: [string, string, string]
): void {
  const fieldW = width / 3;
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.1);
  for (let i = 0; i < 3; i++) {
    const fx = x + i * fieldW;
    doc.rect(fx + 0.3, y + 0.3, fieldW - 0.6, height - 0.6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.5);
    doc.setTextColor(...V5_MUTED);
    doc.text(observations[i] ?? "", fx + 1, y + height - 1, { maxWidth: fieldW - 2 });
  }
  doc.setTextColor(...V5_TEXT);
}

function drawV5_CutLine(doc: jsPDF, y: number, width: number): void {
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.2);
  const dash = 0.66;
  const docDash = doc as jsPDF & { setLineDashPattern?: (a: number[], b: number) => void };
  if (typeof docDash.setLineDashPattern === "function") {
    docDash.setLineDashPattern([dash, dash], 0);
  }
  doc.line(V5_PAD_MM, y, width - V5_PAD_MM, y);
  if (typeof docDash.setLineDashPattern === "function") {
    docDash.setLineDashPattern([], 0);
  }
}

function drawV5_BottomStrip(
  doc: jsPDF,
  y: number,
  width: number,
  height: number,
  etiquetaCode: string,
  aaa: string,
  fullName: string
): void {
  doc.setFillColor(245, 245, 245);
  doc.rect(0, y, width, height, "F");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.15);
  doc.line(0, y, width, y);

  const leftW = width * 0.38;
  const sepX = leftW;
  const midX = sepX + 1.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...V5_TEXT);
  doc.text(`${etiquetaCode}  ${aaa}`, V5_PAD_MM + 1, y + height / 2 + 1);

  doc.setLineWidth(0.25);
  doc.line(sepX, y + 1, sepX, y + height - 1);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(fullName, midX, y + height / 2 + 1, { maxWidth: width - midX - V5_PAD_MM });
}

async function renderEtiquetaPageV5(
  doc: jsPDF,
  item: LabelItem,
  project: ProjectForEtiquetasPdf,
  config: LabelConfig,
  seq: PieceProductionSequence
): Promise<void> {
  const dims = config.dimensions;
  const w = dims.totalWidth_mm;
  const h = dims.totalHeight_mm;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, w, h, "F");
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.2);
  doc.rect(0.3, 0.3, w - 0.6, h - 0.6);

  const effectiveProjectName = item.sourceProjectName ?? project.projectName;
  const etiquetaCode = resolveEtiquetaCodeParaEtiqueta(item, {
    projectName: effectiveProjectName,
    boxes: project.boxes,
    rules: project.rules,
  });
  const nomeIndustrial = nomeIndustrialParaEtiqueta(item, project);
  const fullName = `${effectiveProjectName || "PROJETO"} · ${nomeIndustrial}`;
  const material = (item.material ?? "—").toUpperCase();
  const medidas = formatDimension(
    item.dimensoes?.largura ?? 0,
    item.dimensoes?.altura ?? 0,
    item.espessura
  );
  const aaa = mapPaletteGroupToAAA(seq.paletteGroup);
  const observations: [string, string, string] = ["", "", ""];

  const qrX = V5_PAD_MM;
  const qrY = V5_PAD_MM;
  await drawV5_QR(doc, etiquetaCode, qrX, qrY, dims.qrSize_mm, project.settings);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.5);
  doc.setTextColor(...V5_MUTED);
  doc.text("obs", qrX, qrY + dims.qrSize_mm + 2.5);
  doc.setTextColor(...V5_TEXT);

  const infoX = V5_PAD_MM + dims.qrColumnWidth_mm + 0.5;
  const infoW = w - infoX - V5_PAD_MM;
  const yMaterial = V5_PAD_MM;
  const yGrid = drawV5_Info(doc, infoX, yMaterial, infoW, material, medidas, dims);
  drawV5_ProductionGrid(doc, infoX, yGrid, infoW, dims.productionHeight_mm, seq);

  const yObs = yGrid + dims.productionHeight_mm;
  drawV5_ObservationBar(doc, V5_PAD_MM, yObs, w - 2 * V5_PAD_MM, dims.observationHeight_mm, observations);

  const bottomY = h - dims.bottomStrip_mm;
  const cutY = bottomY - 0.5;
  drawV5_CutLine(doc, cutY, w);
  drawV5_BottomStrip(doc, bottomY, w, dims.bottomStrip_mm, etiquetaCode, aaa, fullName);
}

export async function buildEtiquetasPdf(project: ProjectForEtiquetasPdf): Promise<jsPDF> {
  const ordered = orderByCutLayoutPro(getCutlistWithMetadata(project), project.cutLayoutPlacements);
  const designerConfig = project.designerConfig;

  // Sistema principal: Etiqueta Designer (se configurado pelo utilizador)
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

  // Fallback: rules.etiqueta — v5 (opt-in) ou layout legado
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
      await renderEtiquetaPageV5(doc, ordered[idx], project, v5Cfg, seq);
    } else {
      await renderEtiquetaPage(doc, ordered[idx], project, logoDataUrl);
    }
  }
  return doc;
}
