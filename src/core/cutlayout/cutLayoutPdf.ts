/**
 * PDF do Layout de Corte — A4 retrato, cabeçalho em 2 colunas, diagrama a preencher
 * o espaço entre cabeçalho e tabela (escala até à caixa útil, sem limite scale≤1).
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CutLayoutResult, CutPlacement, SheetResult } from "./cutLayoutTypes";
import { holePhysicalDisplayOffset } from "./layoutCoordinateSystem";
import { drawLogoPiInBox, loadLogoPiDataUrl } from "../pdf/logoPiPublic";
import { resolveAuthoritativeLabelNumber } from "../qrcode/panelLabelNumber";

/** A4 retrato: largura × altura (mm) */
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 8;
/** Largura útil (210 − 16). */
const INNER_W = PAGE_W - MARGIN * 2;
const HEADER_BAND_MM = 28;
const BRAND_RED: [number, number, number] = [139, 0, 0];
const GAP_HEADER_DIAGRAM = 2;
const GAP_DIAGRAM_TABLE = 3;

const FONT_TITLE = 11;
const FONT_LABEL = 8;
const FONT_VALUE = 9;
const LINE_STEP = 5.1;

const TABLE_FONT_PT = 8;
const TABLE_ROW_H_MM = 9;
const TABLE_HEAD_H_MM = 7;
/**
 * Reserva mínima no fim da 1.ª página para cabeçalho da tabela + ≥1 linha
 * (a tabela continua noutras páginas se precisar). Não depende do nº total de peças.
 */
const MIN_TABLE_SLICE_MM = TABLE_HEAD_H_MM + TABLE_ROW_H_MM + 6;

export type CutLayoutPdfOptions = {
  projectName?: string;
  brandRight?: string;
  nestingTopRightOrigin?: boolean;
};

type EdgeBands = { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean };

function placementEdgeBands(pl: CutPlacement): EdgeBands | undefined {
  return (pl as CutPlacement & { fitaBordas?: EdgeBands }).fitaBordas;
}

function formatDatePt(): string {
  return new Date().toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function computeWastePercent(sheetResult: SheetResult): number {
  const { sheet, placements } = sheetResult;
  const sheetArea = Math.max(1, sheet.largura_mm * sheet.altura_mm);
  const used = placements.reduce((a, p) => a + Math.max(0, p.largura_mm) * Math.max(0, p.altura_mm), 0);
  const pct = 100 * (1 - Math.min(used, sheetArea) / sheetArea);
  return Math.round(pct * 10) / 10;
}

function drawDottedLine(
  doc: jsPDF,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 0.01) return;
  const dash = 0.8;
  const gap = 0.9;
  const dx = (x2 - x1) / len;
  const dy = (y2 - y1) / len;
  let t = 0;
  doc.setDrawColor(...BRAND_RED);
  doc.setLineWidth(0.2);
  while (t < len) {
    const t2 = Math.min(t + dash, len);
    doc.line(x1 + dx * t, y1 + dy * t, x1 + dx * t2, y1 + dy * t2);
    t = t2 + gap;
  }
}

/**
 * Cabeçalho em 2 colunas (máx. HEADER_BAND_MM). Devolve Y abaixo do cabeçalho + folga.
 */
function drawPageHeader(
  doc: jsPDF,
  sheetResult: SheetResult,
  globalSheetIndex: number,
  options: CutLayoutPdfOptions,
  logoDataUrl: string | null
): number {
  const { sheet } = sheetResult;
  const project = (options.projectName ?? "Projeto").trim() || "Projeto";
  const material = (sheet.materialName ?? sheet.materialId ?? "Material").trim() || "Material";
  const thickness = sheet.espessura_mm;
  const waste = computeWastePercent(sheetResult);

  const y0 = MARGIN;
  const colGap = 6;
  const leftColW = INNER_W * 0.46;
  const rightX = MARGIN + leftColW + colGap;
  const rightColW = PAGE_W - MARGIN - rightX;
  const labelW = 34;

  const logoSize = 9;
  const textStartX = MARGIN + logoSize + 2.5;
  const textMaxW = leftColW - logoSize - 3;

  drawLogoPiInBox(doc, logoDataUrl, MARGIN, y0 + 0.5, logoSize, BRAND_RED);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_TITLE);
  doc.setTextColor(15, 15, 15);
  const projLines = doc.splitTextToSize(project, textMaxW);
  let ty = y0 + FONT_TITLE * 0.35;
  doc.text(projLines.slice(0, 2), textStartX, ty);
  if (projLines.length > 1) ty += LINE_STEP * 0.95;

  doc.setFontSize(FONT_LABEL);
  doc.text("Data:", textStartX, ty + LINE_STEP);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_VALUE);
  doc.text(formatDatePt(), textStartX + 14, ty + LINE_STEP);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_TITLE);
  doc.setTextColor(15, 15, 15);
  doc.text(`Chapa A${globalSheetIndex}`, rightX, y0 + FONT_TITLE * 0.35);

  let yr = y0 + LINE_STEP + 3;
  const valX = rightX + labelW;

  const row = (label: string, value: string, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FONT_LABEL);
    doc.text(label, rightX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_VALUE);
    doc.text(value, valX, y);
  };

  row("Material:", doc.splitTextToSize(material, rightColW - labelW - 2)[0] ?? material, yr);
  yr += LINE_STEP;
  row("Comprimento:", `${Math.round(sheet.largura_mm)} mm`, yr);
  yr += LINE_STEP;
  row("Largura:", `${Math.round(sheet.altura_mm)} mm`, yr);
  yr += LINE_STEP;
  row("Espessura:", `${thickness} mm`, yr);
  yr += LINE_STEP;
  row("Desperdício:", `${waste}%`, yr);

  doc.setTextColor(0, 0, 0);
  return MARGIN + HEADER_BAND_MM + GAP_HEADER_DIAGRAM;
}

/** Altura útil do diagrama: até à margem inferior, menos reserva fixa para a tabela na 1.ª página. */
function computeDiagramMaxHeightMm(yDiagramTop: number): number {
  const bottomReserve = MARGIN + MIN_TABLE_SLICE_MM + GAP_DIAGRAM_TABLE;
  return Math.max(40, PAGE_H - yDiagramTop - bottomReserve);
}

function drawSheetDiagram(
  doc: jsPDF,
  sheetResult: SheetResult,
  originY: number,
  maxDiagramHeightMm: number,
  topRightOrigin: boolean
): { originX: number; originY: number; drawW: number; drawH: number; scale: number } {
  const { sheet, placements } = sheetResult;
  const maxW = INNER_W;
  const scaleX = maxW / sheet.largura_mm;
  const scaleY = maxDiagramHeightMm / sheet.altura_mm;
  const scale = Math.min(scaleX, scaleY);
  const drawW = sheet.largura_mm * scale;
  const drawH = sheet.altura_mm * scale;
  const originX = MARGIN + (maxW - drawW) / 2;

  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.35);
  doc.rect(originX, originY, drawW, drawH);

  type PlacedRect = { pl: CutPlacement; px: number; py: number; pw: number; ph: number };
  const layoutRects: PlacedRect[] = placements.map((pl) => ({
    pl,
    // Converte TRO x (distância da aresta direita da peça ao lado B) para x físico de A (lado esquerdo).
    // topRightOrigin=true: pl.x_mm está em TRO → físico = W - pl.x_mm - pl.largura_mm
    // topRightOrigin=false: pl.x_mm já está em coordenadas físicas (origem esquerda, sistema nesting)
    px: originX + (topRightOrigin
      ? (sheet.largura_mm - pl.x_mm - pl.largura_mm)
      : pl.x_mm) * scale,
    // Inverter eixo Y: y=0 é o fundo físico → deve aparecer no FUNDO do diagrama.
    py: originY + (sheet.altura_mm - pl.y_mm - pl.altura_mm) * scale,
    pw: pl.largura_mm * scale,
    ph: pl.altura_mm * scale,
  }));

  for (const { pl, px, py, pw, ph } of layoutRects) {
    doc.setDrawColor(...BRAND_RED);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.35);
    doc.rect(px, py, pw, ph, "FD");

    const bands = placementEdgeBands(pl);
    if (bands) {
      const inset = 0.35;
      if (bands.top) drawDottedLine(doc, px + inset, py + inset, px + pw - inset, py + inset);
      if (bands.bottom) drawDottedLine(doc, px + inset, py + ph - inset, px + pw - inset, py + ph - inset);
      if (bands.left) drawDottedLine(doc, px + inset, py + inset, px + inset, py + ph - inset);
      if (bands.right) drawDottedLine(doc, px + pw - inset, py + inset, px + pw - inset, py + ph - inset);
    }

    const origHoles = pl.originalDrillHoles ?? [];
    if (origHoles.length > 0) {
      doc.setFillColor(30, 30, 30);
      doc.setDrawColor(30, 30, 30);
      // piecePhysLeft = x físico da aresta esquerda (A) da peça, medido do lado A da chapa.
      // Já calculado como a mesma expressão usada no px da peça acima.
      const piecePhysLeft = topRightOrigin
        ? (sheet.largura_mm - pl.x_mm - pl.largura_mm)
        : pl.x_mm;
      for (const h of origHoles) {
        const off = holePhysicalDisplayOffset(h.x, h.y, pl.rotacao ?? 0, pl.altura_mm);
        const hx = originX + (piecePhysLeft + off.dx) * scale;
        const hy = py + off.dy * scale;
        const r = Math.max(0.35, Math.min(1.1, ((h.diameter ?? 5) / 2) * scale * 0.85));
        doc.circle(hx, hy, r, "FD");
      }
    }
  }

  for (let i = 0; i < layoutRects.length; i++) {
    const { pl, px, py, pw, ph } = layoutRects[i];
    const auth = resolveAuthoritativeLabelNumber(pl);
    const numStr = String(auth ?? pl.shortCode ?? pl.pieceNumber ?? "—");
    let fs = Math.min(ph * 0.66, pw * 0.55, 42);
    fs = Math.max(5, fs);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_RED);
    doc.setFontSize(fs);
    while (fs > 5 && doc.getTextWidth(numStr) > pw - 1.5) {
      fs -= 0.5;
      doc.setFontSize(fs);
    }
    const textY = py + ph / 2 + fs * 0.28;
    if (textY - fs * 0.85 > py + 0.5 && textY < py + ph - 0.5) {
      doc.text(numStr, px + pw / 2, textY, { align: "center" });
    } else {
      doc.setFontSize(Math.min(fs, ph * 0.45));
      doc.text(numStr, px + pw / 2, py + ph / 2 + Math.min(fs, ph * 0.45) * 0.28, { align: "center" });
    }
    doc.setTextColor(0, 0, 0);
  }

  return { originX, originY, drawW, drawH, scale };
}

export async function buildCutLayoutPdf(
  result: CutLayoutResult,
  options?: CutLayoutPdfOptions
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const opts: CutLayoutPdfOptions = options ?? {};
  const logoDataUrl = await loadLogoPiDataUrl();

  for (let i = 0; i < result.sheets.length; i++) {
    if (i > 0) doc.addPage("a4", "portrait");
    const sheetResult = result.sheets[i];
    const globalSheetIndex = i + 1;

    const yDiagramTop = drawPageHeader(doc, sheetResult, globalSheetIndex, opts, logoDataUrl);
    const maxDiagramH = computeDiagramMaxHeightMm(yDiagramTop);
    const diagram = drawSheetDiagram(
      doc,
      sheetResult,
      yDiagramTop,
      maxDiagramH,
      Boolean(opts.nestingTopRightOrigin)
    );
    const tableStartY = diagram.originY + diagram.drawH + GAP_DIAGRAM_TABLE;

    drawPieceTablePaginated(doc, sheetResult, tableStartY, globalSheetIndex);
  }

  return doc;
}

function drawPieceTablePaginated(
  doc: jsPDF,
  sheetResult: SheetResult,
  firstTableStartY: number,
  globalSheetIndex: number
): void {
  const { placements, sheet } = sheetResult;
  const head = [["Nome da peça", "Dimensões", "Nº Peça", "Qtd na placa", "Imagem da peça"]];

  const bodyRows = placements.map((pl) => [
    String(pl.partName ?? "—").slice(0, 42),
    `${Math.round(pl.largura_mm)}\u00d7${Math.round(pl.altura_mm)} mm`,
    String(resolveAuthoritativeLabelNumber(pl) ?? pl.shortCode ?? pl.pieceNumber ?? "—"),
    "1",
    "",
  ]);

  const rowH = TABLE_ROW_H_MM;
  const headH = TABLE_HEAD_H_MM;
  let rowOffset = 0;
  let startY = firstTableStartY;

  while (rowOffset < bodyRows.length) {
    const available = PAGE_H - startY - MARGIN;
    const maxRows = Math.max(1, Math.floor((available - headH - 1) / rowH));
    const end = Math.min(rowOffset + maxRows, bodyRows.length);
    const slice = bodyRows.slice(rowOffset, end);
    const slicePlacements = placements.slice(rowOffset, end);

    autoTable(doc, {
      startY,
      head,
      body: slice,
      styles: {
        fontSize: TABLE_FONT_PT,
        cellPadding: 1,
        lineColor: [160, 160, 160],
        lineWidth: 0.12,
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: 20,
        fontStyle: "bold",
        fontSize: TABLE_FONT_PT,
      },
      bodyStyles: { minCellHeight: rowH - 1.2 },
      columnStyles: {
        0: { cellWidth: 48 },
        1: { cellWidth: 34 },
        2: { cellWidth: 16 },
        3: { cellWidth: 18 },
        4: { cellWidth: 34 },
      },
      margin: { left: MARGIN, right: MARGIN },
      theme: "grid",
      showHead: "everyPage",
      didDrawCell: (data) => {
        if (data.section !== "body" || data.column.index !== 4) return;
        const pl = slicePlacements[data.row.index];
        if (!pl) return;
        const cell = data.cell;
        const pad = 0.8;
        const cw = cell.width - pad * 2;
        const ch = cell.height - pad * 2;
        const tw = Math.max(3.5, cw * 0.94);
        const th = Math.max(2.8, ch * 0.9);
        const tx = cell.x + pad + (cw - tw) / 2;
        const ty = cell.y + pad + (ch - th) / 2;
        doc.setDrawColor(...BRAND_RED);
        doc.setLineWidth(0.18);
        doc.setFillColor(255, 255, 255);
        doc.rect(tx, ty, tw, th, "FD");
        const scaleThumb = Math.min(tw / pl.largura_mm, th / pl.altura_mm);
        const rw = pl.largura_mm * scaleThumb;
        const rh = pl.altura_mm * scaleThumb;
        const rx = tx + (tw - rw) / 2;
        const ry = ty + (th - rh) / 2;
        doc.setDrawColor(...BRAND_RED);
        doc.rect(rx, ry, rw, rh, "S");
        const thumbHoles = pl.originalDrillHoles ?? [];
        if (thumbHoles.length > 0) {
          doc.setFillColor(25, 25, 25);
          for (const h of thumbHoles) {
            const off = holePhysicalDisplayOffset(h.x, h.y, pl.rotacao ?? 0, pl.altura_mm);
            // off.dx = distância física do furo ao lado A (esquerda) da peça
            // off.dy = distância física do furo ao lado C (topo) da peça
            const hx = rx + (off.dx / pl.largura_mm) * rw;
            const hy = ry + (off.dy / pl.altura_mm) * rh;
            const hr = Math.max(0.18, Math.min(0.5, (h.diameter / 2 / pl.largura_mm) * rw));
            doc.circle(hx, hy, hr, "F");
          }
        }
        const authThumb = resolveAuthoritativeLabelNumber(pl);
        const numStr = String(authThumb ?? pl.shortCode ?? pl.pieceNumber ?? "—");
        let nfs = Math.min(rh * 0.52, rw * 0.42, 9);
        nfs = Math.max(3.5, nfs);
        doc.setFontSize(nfs);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND_RED);
        while (nfs > 3.5 && doc.getTextWidth(numStr) > rw - 0.6) {
          nfs -= 0.5;
          doc.setFontSize(nfs);
        }
        doc.text(numStr, rx + rw / 2, ry + rh / 2 + nfs * 0.28, { align: "center" });
        doc.setTextColor(0, 0, 0);
      },
    });

    rowOffset = end;
    if (rowOffset >= bodyRows.length) break;

    doc.addPage("a4", "portrait");
    doc.setFontSize(FONT_TITLE);
    doc.setFont("helvetica", "bold");
    doc.text(`Chapa A${globalSheetIndex} — Lista de peças (continuação)`, MARGIN, MARGIN + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_LABEL);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Material: ${sheet.materialName ?? sheet.materialId ?? "—"} · ${Math.round(sheet.largura_mm)}\u00d7${Math.round(sheet.altura_mm)} mm`,
      MARGIN,
      MARGIN + 10
    );
    doc.setTextColor(0, 0, 0);
    startY = MARGIN + 14;
  }
}
