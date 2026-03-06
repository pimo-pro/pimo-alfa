/**
 * BACKUP: versão atual antes da restauração do modelo legado v2.8.9.
 * PDF Cutlist — tabela de peças para corte.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import qrcode from "qrcode-generator";
import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import type { SettingsSchema } from "../settings/settingsService";
import { cutlistComPrecoFromBoxes } from "../manufacturing/cutlistFromBoxes";
import { buildLocalQrPayload } from "../qrcode/qrcodeService";
import { generateQrCanvasWithLogo } from "../qrcode/qrcodeLogoService";

export type ProjectForPdf = {
  projectName: string;
  boxes: BoxModule[];
  rules: RulesConfig;
  materialId?: string;
  extractedPartsByBoxId?: Record<string, Record<string, CutListItemComPreco[]>>;
  settings?: SettingsSchema;
};

const MARGIN = 14;
const HEADER_COLOR: [number, number, number] = [15, 23, 42];

function getFullCutlist(project: ProjectForPdf): Array<CutListItemComPreco & { boxNome: string; tipoBorda?: string }> {
  const parametric = cutlistComPrecoFromBoxes(
    project.boxes,
    project.rules,
    project.materialId,
    project.projectName
  );
  const boxById = new Map(project.boxes.map((b) => [b.id, b]));

  const rows: Array<CutListItemComPreco & { boxNome: string; tipoBorda?: string }> = parametric.map((p) => {
    const box = boxById.get(p.boxId ?? "");
    return {
      ...p,
      boxNome: box?.nome ?? p.boxId ?? "—",
      tipoBorda: box?.tipoBorda,
    };
  });

  const extractedByBox = project.extractedPartsByBoxId ?? {};
  for (const box of project.boxes) {
    const byModel = extractedByBox[box.id];
    if (!byModel) continue;
    const extracted = Object.values(byModel).flat();
    for (const p of extracted) {
      rows.push({
        ...p,
        boxNome: box.nome ?? box.id,
        tipoBorda: box.tipoBorda,
      });
    }
  }

  return rows;
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

async function renderQrLayer(
  doc: jsPDF,
  parts: Array<CutListItemComPreco & { boxNome?: string; tipoBorda?: string }>,
  project: ProjectForPdf
) {
  const withQr = parts.filter((p) => Number.isFinite(p.pieceNumber) && (p.pieceNumber ?? 0) > 0);
  if (withQr.length === 0) return;
  doc.addPage("a4", "landscape");
  let y = MARGIN;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Cutlist - QR Codes por Peça", MARGIN, y);
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Rastreio local: QR com código curto da etiqueta.", MARGIN, y);
  y += 8;

  const pageW = doc.internal.pageSize.getWidth();
  const cardW = (pageW - MARGIN * 2 - 12) / 3;
  const cardH = 42;
  const qrSize = Math.max(10, project.rules.qrcode.tamanhoQr);
  const textSize = Math.max(6, Math.min(10, project.rules.qrcode.tamanhoTexto));
  let col = 0;
  let rowY = y;

  for (let i = 0; i < withQr.length; i++) {
    const p = withQr[i];
    const x = MARGIN + col * (cardW + 6);
    doc.setDrawColor(180, 180, 180);
    doc.rect(x, rowY, cardW, cardH);
    doc.setFontSize(8);
    doc.text(`${p.boxNome ?? "—"} · ${p.nome}`, x + 2, rowY + 4);
    doc.text(`${p.dimensoes.largura}x${p.dimensoes.altura} mm`, x + 2, rowY + 8);

    const qrX = x + 2;
    const qrY = rowY + 10;
    const pieceNumber = Number(p.pieceNumber ?? 0);
    const etiquetaCode = buildLocalQrPayload(
      p,
      { projectName: project.projectName, boxes: project.boxes, rules: project.rules },
      pieceNumber
    );
    await drawQrWithLogoOrFallback(doc, etiquetaCode, qrX, qrY, qrSize, project.settings);

    if (project.rules.qrcode.mostrarTextoAbaixoQr) {
      doc.setFontSize(textSize);
      doc.setFont("helvetica", "bold");
      doc.text(etiquetaCode, qrX + qrSize + 3, qrY + 6);
    }
    if (project.rules.qrcode.destacarNumeroPeca) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`Nº: ${etiquetaCode}`, qrX + qrSize + 3, qrY + 11);
    }

    col += 1;
    if (col > 2) {
      col = 0;
      rowY += cardH + 6;
      if (rowY + cardH > doc.internal.pageSize.getHeight() - MARGIN) {
        doc.addPage("a4", "landscape");
        rowY = MARGIN + 10;
      }
    }
  }
}

export function renderCutlistTable(
  doc: jsPDF,
  parts: Array<CutListItemComPreco & { boxNome?: string; tipoBorda?: string }>,
  startY: number
): number {
  const head = ["Caixa", "Peça", "L×A×P (mm)", "Borda (fita)", "Qtd", "Observações"];
  const body = parts.map((p) => [
    p.boxNome ?? "—",
    p.nome,
    `${p.dimensoes.largura}×${p.dimensoes.altura}×${p.dimensoes.profundidade}`,
    p.tipoBorda ?? "reta",
    String(p.quantidade),
    "",
  ]);

  if (body.length === 0) {
    body.push(["Nenhuma peça", "—", "—", "—", "—", "—"]);
  }

  autoTable(doc, {
    head: [head],
    body,
    startY,
    styles: { fontSize: 9 },
    headStyles: { fillColor: HEADER_COLOR },
    margin: { left: MARGIN, right: MARGIN },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 45 },
      2: { cellWidth: 45 },
      3: { cellWidth: 28 },
      4: { cellWidth: 18 },
      5: { cellWidth: "auto" },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY;
  return finalY;
}

function drawFurosForPart(
  doc: jsPDF,
  part: CutListItemComPreco,
  startX: number,
  startY: number,
  drawW: number,
  drawH: number
) {
  const drillHoles = part.drillHoles ?? [];
  const holes = drillHoles.map((h) => ({ x: h.x, y: h.y, diametro: h.diameter, profundidade: h.depth }));
  if (holes.length === 0) return;
  const scale = Math.min(
    drawW / Math.max(1, part.dimensoes.largura),
    drawH / Math.max(1, part.dimensoes.altura)
  );
  const pieceW = part.dimensoes.largura * scale;
  const pieceH = part.dimensoes.altura * scale;
  const offsetX = startX + (drawW - pieceW) / 2;
  const offsetY = startY + (drawH - pieceH) / 2;
  doc.setDrawColor(34, 34, 34);
  doc.setFillColor(248, 250, 252);
  doc.rect(offsetX, offsetY, pieceW, pieceH, "FD");
  doc.setDrawColor(30, 64, 175);
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(7);
  const arrowX = offsetX + Math.max(6, pieceW - 10);
  const arrowY = Math.max(startY + 4, offsetY - 2);
  doc.line(arrowX, arrowY + 4, arrowX, arrowY);
  doc.line(arrowX, arrowY, arrowX - 1.2, arrowY + 1.2);
  doc.line(arrowX, arrowY, arrowX + 1.2, arrowY + 1.2);
  doc.text("Topo", arrowX - 7, arrowY - 0.5);
  for (const h of holes) {
    const radiusMm = Math.max(0.3, h.diametro / 2);
    const hx = Math.min(Math.max(h.x, radiusMm), Math.max(radiusMm, part.dimensoes.largura - radiusMm));
    const hy = Math.min(Math.max(h.y, radiusMm), Math.max(radiusMm, part.dimensoes.altura - radiusMm));
    const cx = offsetX + hx * scale;
    const cy = offsetY + hy * scale;
    const r = Math.max(0.45, radiusMm * scale);
    doc.circle(cx, cy, r);
    const dLeft = hx;
    const dRight = Math.max(0, part.dimensoes.largura - hx);
    const dTop = hy;
    const dBottom = Math.max(0, part.dimensoes.altura - hy);
    const depthLabel = Number.isFinite(h.profundidade) ? ` · P:${h.profundidade}` : "";
    doc.text(
      `Ø${h.diametro}${depthLabel}  E:${Math.round(dLeft)} D:${Math.round(dRight)} T:${Math.round(dTop)} B:${Math.round(dBottom)}`,
      Math.min(startX + drawW - 2, cx + r + 1.2),
      Math.max(startY + 2, cy - r - 0.8),
      { align: "right" }
    );
  }
}

function renderFurosLayer(
  doc: jsPDF,
  parts: Array<CutListItemComPreco & { boxNome?: string; tipoBorda?: string }>,
  startY: number
) {
  const withHoles = parts.filter((p) => (p.drillHoles?.length ?? 0) > 0);
  if (withHoles.length === 0) return;
  doc.addPage("a4", "landscape");
  let y = startY;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Cutlist - Camada de Furos", MARGIN, y);
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Furação Técnica: círculos em escala real da peça e cotas às bordas.", MARGIN, y);
  y += 8;

  const pageW = doc.internal.pageSize.getWidth();
  const cardW = (pageW - MARGIN * 2 - 8) / 2;
  const cardH = 55;
  let col = 0;
  let rowY = y;
  for (let i = 0; i < withHoles.length; i++) {
    const p = withHoles[i];
    const x = MARGIN + col * (cardW + 8);
    doc.setDrawColor(180, 180, 180);
    doc.rect(x, rowY, cardW, cardH);
    doc.setFontSize(8);
    doc.text(`${p.boxNome ?? "—"} · ${p.nome}`, x + 2, rowY + 4);
    doc.text(
      `${p.dimensoes.largura}x${p.dimensoes.altura} mm · orientação de referência 0°`,
      x + 2,
      rowY + 8
    );
    const drawX = x + 4;
    const drawY = rowY + 12;
    const drawW = cardW - 8;
    const drawH = cardH - 16;
    doc.setDrawColor(120, 120, 120);
    doc.rect(drawX, drawY, drawW, drawH);
    drawFurosForPart(doc, p, drawX, drawY, drawW, drawH);

    col += 1;
    if (col > 1) {
      col = 0;
      rowY += cardH + 6;
      if (rowY + cardH > doc.internal.pageSize.getHeight() - MARGIN) {
        doc.addPage("a4", "landscape");
        rowY = MARGIN + 10;
      }
    }
  }
}

export async function buildCutlistPdf(project: ProjectForPdf, existingDoc?: jsPDF): Promise<jsPDF> {
  const doc = existingDoc ?? new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  if (existingDoc) {
    existingDoc.addPage("a4", "landscape");
  }

  let y = MARGIN;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Cutlist", MARGIN, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Projeto: ${project.projectName || "Projeto"}`, MARGIN, y);
  y += 6;

  doc.setFontSize(9);
  doc.text(
    `Data: ${new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })}`,
    MARGIN,
    y
  );
  y += 12;

  const parts = getFullCutlist(project);
  y = renderCutlistTable(doc, parts, y);
  renderFurosLayer(doc, parts, MARGIN);
  await renderQrLayer(doc, parts, project);

  return doc;
}
