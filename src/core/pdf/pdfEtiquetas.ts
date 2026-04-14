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

  // Fallback: sistema rules.etiqueta (compatibilidade total com projetos existentes)
  const cfg = project.rules.etiqueta;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [cfg.larguraMm, cfg.alturaMm],
  });
  const logoDataUrl = await loadLogoPiDataUrl();
  for (let idx = 0; idx < ordered.length; idx++) {
    if (idx > 0) doc.addPage([cfg.larguraMm, cfg.alturaMm], "landscape");
    await renderEtiquetaPage(doc, ordered[idx], project, logoDataUrl);
  }
  return doc;
}
