import jsPDF from "jspdf";
import qrcode from "qrcode-generator";
import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import type { SettingsSchema } from "../settings/settingsService";
import { cutlistComPrecoFromBoxes } from "../manufacturing/cutlistFromBoxes";
import { buildLocalQrPayload } from "../qrcode/qrcodeService";
import { generateQrCanvasWithLogo } from "../qrcode/qrcodeLogoService";

export type ProjectForEtiquetasPdf = {
  projectName: string;
  boxes: BoxModule[];
  rules: RulesConfig;
  materialId?: string;
  extractedPartsByBoxId?: Record<string, Record<string, CutListItemComPreco[]>>;
  settings?: SettingsSchema; // Configurações para logo QR
};

type LabelItem = CutListItemComPreco & {
  boxNome?: string;
  pieceName?: string;
};

function getCutlistWithMetadata(project: ProjectForEtiquetasPdf): LabelItem[] {
  const parametric = cutlistComPrecoFromBoxes(
    project.boxes,
    project.rules,
    project.materialId,
    project.projectName
  );
  const boxById = new Map(project.boxes.map((b) => [b.id, b]));
  const merged: LabelItem[] = parametric.map((p) => ({
    ...p,
    boxNome: boxById.get(p.boxId ?? "")?.nome ?? p.boxId ?? "—",
    pieceName: p.nome,
  }));

  const extractedByBox = project.extractedPartsByBoxId ?? {};
  for (const box of project.boxes) {
    const byModel = extractedByBox[box.id];
    if (!byModel) continue;
    const extracted = Object.values(byModel).flat();
    for (const p of extracted) {
      merged.push({
        ...p,
        boxNome: box.nome ?? box.id,
        pieceName: p.nome,
      });
    }
  }
  return merged;
}

function orderByCutLayoutPro(items: LabelItem[]): LabelItem[] {
  // Requisito: não recalcular layout; apenas consumir ordem já existente da cutlist final.
  return items;
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
  // Se logo está desativado, usa fallback ao QR simples
  if (!settings?.etiquetasQr?.logoAtivado || !settings?.etiquetasQr?.logoDataUrl) {
    drawQrFromCode(doc, code, x, y, size);
    return;
  }

  try {
    // Tenta gerar QR com logo
    const canvas = await generateQrCanvasWithLogo(code, size * 10, {
      logoDataUrl: settings.etiquetasQr.logoDataUrl,
      logoSizePercent: settings.etiquetasQr.logoTamanhoPorcento,
    });

    // Converte canvas para data URL e insere no PDF
    const imgData = canvas.toDataURL("image/png");
    doc.addImage(imgData, "PNG", x, y, size, size);
  } catch {
    // Em caso de erro, volta a usar QR simples
    drawQrFromCode(doc, code, x, y, size);
  }
}

async function renderEtiquetaPage(doc: jsPDF, item: LabelItem, project: ProjectForEtiquetasPdf) {
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

  let y = margin + 2;
  doc.setTextColor(10, 10, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  if (cfg.mostrarLogoEmpresa && cfg.mostrarLogo) {
    doc.text("pi", margin, y);
  }

  const ref = `${project.projectName || "PROJETO"}_${item.boxNome ?? item.boxId ?? "BOX"}_${item.pieceName ?? item.nome}`;
  const refX = cfg.mostrarLogo ? margin + 8 : margin;
  const refMaxW = width - refX - margin;
  if (cfg.mostrarReferencia) {
    const refLines = doc.splitTextToSize(ref.toUpperCase(), refMaxW);
    doc.text(refLines.slice(0, 2), refX, y);
    y += refLines.length > 1 ? 6 : 3.5;
  }

  const qrX = margin;
  const qrY = y + 1.5;
  const pieceNumber = Number(item.pieceNumber ?? 0);
  const etiquetaCode = buildLocalQrPayload(item, {
    projectName: project.projectName,
    boxes: project.boxes,
    rules: project.rules,
  }, pieceNumber);
  
  // Usa novo serviço com suporte a logo
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
  const cfg = project.rules.etiqueta;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [cfg.larguraMm, cfg.alturaMm],
  });

  const ordered = orderByCutLayoutPro(getCutlistWithMetadata(project));
  for (let idx = 0; idx < ordered.length; idx++) {
    const item = ordered[idx];
    if (idx > 0) doc.addPage([cfg.larguraMm, cfg.alturaMm], "landscape");
    await renderEtiquetaPage(doc, item, project);
  }
  return doc;
}
