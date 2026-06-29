/**
 * Layout partilhado — PDFs industriais (técnico, cutlist, unificado).
 * A4 landscape, margens reduzidas, linhas compactas (~38/página de continuação).
 * Não altera cutlist/TCN/TXML — apenas apresentação PDF.
 */

import type jsPDF from "jspdf";

export const PDF_INDUSTRIAL_MARGIN = 8;
export const PDF_INDUSTRIAL_PAGE_W = 297;
export const PDF_INDUSTRIAL_FOOTER_Y = 207;
export const PDF_INDUSTRIAL_HEADER_COLOR: [number, number, number] = [15, 23, 42];
export const PDF_INDUSTRIAL_ROW_ALT: [number, number, number] = [245, 245, 245];
export const PDF_INDUSTRIAL_GRID_LINE: [number, number, number] = [0, 0, 0];
export const PDF_INDUSTRIAL_GRID_WIDTH = 0.15;
/** ~38 linhas úteis por página de continuação. */
export const PDF_INDUSTRIAL_ROW_MIN_H = 4.8;
/** Largura No ETQ — 13 caracteres @ 7pt. */
export const PDF_INDUSTRIAL_ETQ_COL_WIDTH = 18;
/** Largura ESP (3 dígitos). */
export const PDF_INDUSTRIAL_ESP_COL_WIDTH = 9;
/** Largura QTD (2–3 dígitos). */
export const PDF_INDUSTRIAL_QTD_COL_WIDTH = 8;

/** Etapas operacionais — sem FOLHEAGEM, CNC nem CORTE DISCO/NESTING. */
export const PDF_OPERATIONAL_STAGES = ["CORTE manual", "ORLAGEM", "MONTAGEM"] as const;

export type IndustrialPdfHeaderInfo = {
  designer: string;
  designDate: string;
};

export type IndustrialProjectBlockInfo = {
  projectName: string;
  acabamento: string;
  boxCount: number;
  totalPieces: number;
};

/** Cabeçalho principal: PIMO + Designer + Data de design. */
export function drawIndustrialPdfTitleHeader(
  doc: jsPDF,
  info: IndustrialPdfHeaderInfo
): number {
  let y = PDF_INDUSTRIAL_MARGIN;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text("PIMO", PDF_INDUSTRIAL_MARGIN, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const infoRight = `Designer: ${info.designer}     Data de design: ${info.designDate}`;
  doc.text(
    infoRight,
    PDF_INDUSTRIAL_PAGE_W - PDF_INDUSTRIAL_MARGIN - doc.getTextWidth(infoRight),
    y + 6
  );
  doc.setTextColor(0, 0, 0);
  return y + 12;
}

/** Bloco projeto / acabamento / caixas / peças (2×2). */
export function drawIndustrialProjectInfoBlock(
  doc: jsPDF,
  startY: number,
  info: IndustrialProjectBlockInfo
): { nextY: number; totalPiecesLabelPos: { x: number; y: number } } {
  const blockW = PDF_INDUSTRIAL_PAGE_W - PDF_INDUSTRIAL_MARGIN * 2;
  const rowH = 7;
  const infoH = rowH * 2;
  const blockX = PDF_INDUSTRIAL_MARGIN;
  const blockY = startY;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(blockX, blockY, blockW, infoH);
  doc.line(blockX, blockY + rowH, blockX + blockW, blockY + rowH);
  doc.line(blockX + blockW / 2, blockY, blockX + blockW / 2, blockY + infoH);

  const c1x = blockX + 4;
  const c2x = blockX + blockW / 2 + 4;

  const boldLabel = (label: string, lx: number, ly: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(label, lx, ly);
  };
  const normalVal = (val: string, lx: number, ly: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(val, lx, ly);
  };

  let iy = blockY + rowH - 1.5;
  boldLabel("PROJETO / MOVEL:", c1x, iy);
  normalVal(info.projectName || "Projeto", c1x + doc.getTextWidth("PROJETO / MOVEL:") + 2, iy);
  boldLabel("Acabamento:", c2x, iy);
  normalVal(info.acabamento, c2x + doc.getTextWidth("Acabamento:") + 2, iy);

  iy += rowH;
  boldLabel("No. de Caixas:", c1x, iy);
  normalVal(String(info.boxCount), c1x + doc.getTextWidth("No. de Caixas:") + 2, iy);
  boldLabel("Pecas Total:", c2x, iy);
  const totalPecasPos = { x: c2x + doc.getTextWidth("Pecas Total:") + 2, y: iy };

  return { nextY: blockY + infoH + 1, totalPiecesLabelPos: totalPecasPos };
}

/** Bloco datas operacionais (CORTE manual, ORLAGEM, MONTAGEM). */
export function drawIndustrialOperationalDatesBlock(
  doc: jsPDF,
  blockX: number,
  blockY: number,
  blockW: number,
  c1x: number,
  c2x: number
): number {
  const etapas = PDF_OPERATIONAL_STAGES;
  const dateRowH = 7;
  const dateBlockH = etapas.length * dateRowH;
  const midDateX = blockX + blockW / 2;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(blockX, blockY, blockW, dateBlockH);
  doc.line(midDateX, blockY, midDateX, blockY + dateBlockH);

  for (let i = 0; i < etapas.length; i++) {
    const rowY = blockY + i * dateRowH;
    if (i > 0) {
      doc.setLineWidth(0.15);
      doc.line(blockX, rowY, blockX + blockW, rowY);
    }
    const textY = rowY + dateRowH - 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(etapas[i], c1x, textY);
    const labelW = doc.getTextWidth(etapas[i]);
    doc.setFont("helvetica", "normal");
    doc.text("  inicio:", c1x + labelW, textY);
    const siW = doc.getTextWidth("  inicio:");
    doc.setLineWidth(0.2);
    doc.line(c1x + labelW + siW + 1, textY + 0.3, c1x + labelW + siW + 25, textY + 0.3);
    doc.text(" h:", c1x + labelW + siW + 27, textY);
    const hW = doc.getTextWidth(" h:");
    doc.line(c1x + labelW + siW + 27 + hW + 1, textY + 0.3, c1x + labelW + siW + 27 + hW + 12, textY + 0.3);

    doc.setFont("helvetica", "normal");
    doc.text("fim:", c2x, textY);
    const fW = doc.getTextWidth("fim:");
    doc.line(c2x + fW + 1, textY + 0.3, c2x + fW + 25, textY + 0.3);
    doc.text(" h:", c2x + fW + 27, textY);
    doc.line(c2x + fW + 27 + hW + 1, textY + 0.3, c2x + fW + 27 + hW + 12, textY + 0.3);
  }

  return blockY + dateBlockH;
}

export function drawIndustrialSectionTitle(doc: jsPDF, y: number, title: string): number {
  const blockW = PDF_INDUSTRIAL_PAGE_W - PDF_INDUSTRIAL_MARGIN * 2;
  const blockX = PDF_INDUSTRIAL_MARGIN;
  doc.setFillColor(200, 200, 200);
  doc.rect(blockX, y, blockW, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(title, blockX + (blockW - doc.getTextWidth(title)) / 2, y + 4.2);
  return y + 7;
}

export function drawIndustrialPdfFooter(
  doc: jsPDF,
  designDate: string,
  numRefs: number,
  totalPecas: number
): void {
  const pageCount = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(
      `PIMO  |  ${designDate}  |  ${numRefs} ref.  |  ${totalPecas} pecas  |  pag. ${p}/${pageCount}`,
      PDF_INDUSTRIAL_MARGIN,
      PDF_INDUSTRIAL_FOOTER_Y
    );
  }
  doc.setTextColor(0, 0, 0);
}

export function getIndustrialAutoTableStyles() {
  return {
    fontSize: 7,
    cellPadding: 1,
    lineColor: PDF_INDUSTRIAL_GRID_LINE,
    lineWidth: PDF_INDUSTRIAL_GRID_WIDTH,
    overflow: "hidden" as const,
    minCellHeight: PDF_INDUSTRIAL_ROW_MIN_H,
  };
}

export function getIndustrialAutoTableMargins() {
  return {
    left: PDF_INDUSTRIAL_MARGIN,
    right: PDF_INDUSTRIAL_MARGIN,
    top: PDF_INDUSTRIAL_MARGIN,
    bottom: 12,
  };
}

export function getIndustrialHeadStyles() {
  return {
    fillColor: PDF_INDUSTRIAL_HEADER_COLOR,
    textColor: [255, 255, 255] as [number, number, number],
    lineColor: PDF_INDUSTRIAL_GRID_LINE,
    lineWidth: PDF_INDUSTRIAL_GRID_WIDTH,
    fontSize: 7,
    fontStyle: "bold" as const,
  };
}

export function formatIndustrialDesignDate(): string {
  return new Date().toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
