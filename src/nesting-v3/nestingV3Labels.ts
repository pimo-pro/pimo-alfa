/**
 * Nesting V3 — Etiquetas da estacao de layout.
 *
 * Producao / ZIP / UEE: usar IndustrialCenter.getUeeItems() + UnifiedEtiquetaEngine.
 * Este PDF e auxiliar da estacao (peca + folha + posicao V3); nao substitui UEE.
 */

import jsPDF from "jspdf";
import qrcode from "qrcode-generator";
import type { NestingV3State, V3Piece, V3Placement } from "./nestingV3Types";

// ── Config de etiquetas ───────────────────────────────────────────────────────

const LABEL_W   = 90;   // mm (A4 landscape: 3 por linha)
const LABEL_H   = 50;   // mm
const COLS      = 2;
const ROWS      = 5;
const PAGE_W    = 210;
const PAGE_H    = 297;
const MARGIN_X  = (PAGE_W - COLS * LABEL_W) / 2;
const MARGIN_Y  = (PAGE_H - ROWS * LABEL_H) / 2;

// Cores
const CLR_NAVY:  [number, number, number] = [15,  23,  42];
const CLR_MUTED: [number, number, number] = [100, 116, 139];

// ── QR Code ───────────────────────────────────────────────────────────────────

function generateQrDataUrl(data: string): string | null {
  try {
    const qr = qrcode(0, "M");
    qr.addData(data);
    qr.make();
    // Build data URI from modules
    const size = qr.getModuleCount();
    const cellSize = 2;
    const margin = 2;
    const canvasSize = size * cellSize + margin * 2;

    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = "#000000";

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(margin + col * cellSize, margin + row * cellSize, cellSize, cellSize);
        }
      }
    }
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

// ── Payload do QR ────────────────────────────────────────────────────────────

function buildQrPayload(piece: V3Piece, placement: V3Placement, projectName: string): string {
  return JSON.stringify({
    proj: projectName.slice(0, 20),
    peca: piece.name.slice(0, 20),
    folha: placement.sheetIndex + 1,
    dim: `${piece.widthMm}x${piece.heightMm}x${piece.thicknessMm}`,
    pos: `${Math.round(placement.xMm)},${Math.round(placement.yMm)}`,
    rot: piece.rotation,
  });
}

// ── Desenhar uma etiqueta ─────────────────────────────────────────────────────

function drawLabel(
  doc: jsPDF,
  piece: V3Piece,
  placement: V3Placement,
  projectName: string,
  col: number,
  row: number
): void {
  const x = MARGIN_X + col * LABEL_W;
  const y = MARGIN_Y + row * LABEL_H;

  const PAD = 3;

  // Border
  const [nr, ng, nb] = CLR_NAVY;
  doc.setDrawColor(nr, ng, nb);
  doc.setLineWidth(0.4);
  doc.rect(x, y, LABEL_W, LABEL_H);

  // Header bar
  doc.setFillColor(nr, ng, nb);
  doc.rect(x, y, LABEL_W, 9, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(piece.name.slice(0, 28), x + PAD, y + 6);
  doc.setTextColor(0, 0, 0);

  // QR code (right side)
  const QR_SIZE = LABEL_H - 9 - PAD * 2;
  const qrData = buildQrPayload(piece, placement, projectName);
  const qrUrl  = generateQrDataUrl(qrData);
  const qrX    = x + LABEL_W - QR_SIZE - PAD;
  const qrY    = y + 9 + PAD;

  if (qrUrl) {
    doc.addImage(qrUrl, "PNG", qrX, qrY, QR_SIZE, QR_SIZE);
  } else {
    // Placeholder if QR fails
    doc.setDrawColor(200, 200, 200);
    doc.rect(qrX, qrY, QR_SIZE, QR_SIZE);
    doc.setFontSize(6);
    const [mr, mg, mb] = CLR_MUTED;
    doc.setTextColor(mr, mg, mb);
    doc.text("QR", qrX + QR_SIZE / 2, qrY + QR_SIZE / 2 + 1, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  // Info text
  const infoX = x + PAD;
  let infoY = y + 9 + PAD + 4;
  const infoW = LABEL_W - QR_SIZE - PAD * 3;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const [mr, mg, mb] = CLR_MUTED;
  const [tr, tg, tb] = [30, 41, 59];

  const infoLines: [string, string][] = [
    ["L × A",     `${piece.widthMm} × ${piece.heightMm} mm`],
    ["Esp.",      `${piece.thicknessMm} mm`],
    ["Rotação",   `${piece.rotation}°`],
    ["Folha",     `${placement.sheetIndex + 1}`],
    ["X · Y",     `${Math.round(placement.xMm)} · ${Math.round(placement.yMm)} mm`],
    ["Furos",     `${piece.originalHoles.length}`],
  ];

  for (const [label, val] of infoLines) {
    if (infoY > y + LABEL_H - PAD) break;
    doc.setTextColor(mr, mg, mb);
    doc.text(label, infoX, infoY);
    doc.setTextColor(tr, tg, tb);
    doc.text(val, infoX + (infoW > 30 ? 16 : 10), infoY);
    infoY += 5;
  }

  // Project name micro label
  doc.setFontSize(5.5);
  doc.setTextColor(mr, mg, mb);
  doc.text(projectName.slice(0, 30), x + PAD, y + LABEL_H - PAD);
  doc.setTextColor(0, 0, 0);

  // Cut mark lines
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.15);
  const M = 1.5;
  // corners
  doc.line(x - M, y, x, y);   doc.line(x, y - M, x, y);
  doc.line(x + LABEL_W, y - M, x + LABEL_W, y); doc.line(x + LABEL_W, y, x + LABEL_W + M, y);
  doc.line(x - M, y + LABEL_H, x, y + LABEL_H); doc.line(x, y + LABEL_H, x, y + LABEL_H + M);
  doc.line(x + LABEL_W, y + LABEL_H, x + LABEL_W + M, y + LABEL_H);
  doc.line(x + LABEL_W, y + LABEL_H, x + LABEL_W, y + LABEL_H + M);
}

// ── Entrada pública ───────────────────────────────────────────────────────────

/**
 * Gera um PDF com etiquetas para todas as peças colocadas.
 */
export function generateNestingV3Labels(
  state: NestingV3State,
  projectName = "Projeto"
): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const placedItems = state.placements
    .map((pl) => ({ pl, piece: state.pieces.find((p) => p.id === pl.pieceId)! }))
    .filter((x) => x.piece);

  if (placedItems.length === 0) {
    doc.setFontSize(12);
    doc.text("Nenhuma peça colocada para gerar etiquetas.", 20, 40);
    return doc.output("blob");
  }

  let col = 0;
  let row = 0;
  let firstPage = true;

  for (const { pl, piece } of placedItems) {
    if (!firstPage && col === 0 && row === 0) {
      doc.addPage();
    }
    firstPage = false;

    drawLabel(doc, piece, pl, projectName, col, row);

    col++;
    if (col >= COLS) {
      col = 0;
      row++;
      if (row >= ROWS) {
        row = 0;
        if (placedItems.indexOf({ pl, piece }) < placedItems.length - 1) {
          doc.addPage();
        }
      }
    }
  }

  return doc.output("blob");
}

/**
 * Download das etiquetas.
 */
export function downloadNestingV3Labels(state: NestingV3State, projectName = "Projeto"): void {
  const blob = generateNestingV3Labels(state, projectName);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `${projectName.replace(/\s+/g, "_")}_Etiquetas.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
