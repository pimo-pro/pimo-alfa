/**
 * PDF do Layout de Corte — uma página por chapa.
 * Desenho das peças (retângulos), dimensões, identificação, kerf visível.
 */

import jsPDF from "jspdf";
import type { CutLayoutResult, SheetResult } from "./cutLayoutTypes";
import { toLayoutAbsoluteX, toLayoutPlacementX } from "./layoutCoordinateSystem";

const MARGIN = 14;
const DRAW_W = 180;
const DRAW_H = 250;

/**
 * Gera PDF do layout de corte.
 */
export function buildCutLayoutPdf(result: CutLayoutResult): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const totalByMaterial = new Map<string, number>();
  const renderedByMaterial = new Map<string, number>();

  const materialKey = (sheet: SheetResult["sheet"]) =>
    `${sheet.materialId ?? sheet.materialName ?? "Material"}|${sheet.espessura_mm}`;

  result.sheets.forEach((sheet) => {
    const key = materialKey(sheet.sheet);
    totalByMaterial.set(key, (totalByMaterial.get(key) ?? 0) + 1);
  });

  for (let i = 0; i < result.sheets.length; i++) {
    if (i > 0) doc.addPage("a4", "portrait");
    const sheet = result.sheets[i];
    const key = materialKey(sheet.sheet);
    const current = (renderedByMaterial.get(key) ?? 0) + 1;
    renderedByMaterial.set(key, current);
    renderSheetPage(doc, sheet, i + 1, current, totalByMaterial.get(key) ?? 1);
  }

  return doc;
}

function renderSheetPage(
  doc: jsPDF,
  sheetResult: SheetResult,
  sheetNumber: number,
  materialIndex: number,
  materialTotal: number
): void {
  const { sheet, placements } = sheetResult;

  let y = MARGIN;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Layout de Corte — Chapa ${sheetNumber}`, MARGIN, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Material: ${sheet.materialName ?? sheet.materialId ?? "—"} | Espessura: ${sheet.espessura_mm} mm | Chapa ${materialIndex}/${materialTotal}`,
    MARGIN,
    y
  );
  y += 6;
  doc.text(
    `Dimensões: ${sheet.largura_mm} × ${sheet.altura_mm} mm | Peças nesta chapa: ${placements.length}`,
    MARGIN,
    y
  );
  y += 12;

  const scaleX = DRAW_W / sheet.largura_mm;
  const scaleY = DRAW_H / sheet.altura_mm;
  const scale = Math.min(scaleX, scaleY, 1);
  const drawW = sheet.largura_mm * scale;
  const drawH = sheet.altura_mm * scale;
  const originX = MARGIN;
  const originY = y;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(originX, originY, drawW, drawH);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`${sheet.largura_mm}×${sheet.altura_mm} mm`, originX + drawW / 2 - 15, originY - 2);
  doc.setTextColor(0, 0, 0);

  for (const pl of placements) {
    const px = originX + toLayoutPlacementX(pl.x_mm, pl.largura_mm, sheet.largura_mm) * scale;
    const py = originY + pl.y_mm * scale;
    const pw = pl.largura_mm * scale;
    const ph = pl.altura_mm * scale;

    doc.setDrawColor(30, 64, 175);
    doc.setFillColor(239, 246, 255);
    doc.setLineWidth(0.25);
    doc.rect(px, py, pw, ph, "FD");

    // Display piece number if available
    if (pl.pieceNumber) {
      doc.setFontSize(10);
      doc.setTextColor(220, 38, 38);
      doc.setFont("helvetica", "bold");
      doc.text(`#${pl.pieceNumber}`, px + 2, py - 2);
    }

    const label = `${pl.partName}`.slice(0, 12);
    const dimLabel = `${Math.round(pl.largura_mm)}×${Math.round(pl.altura_mm)}`;
    if (pw > 15 && ph > 8) {
      doc.setFontSize(6);
      doc.setTextColor(30, 64, 175);
      doc.text(label, px + 2, py + ph / 2 - 2);
      doc.text(dimLabel, px + 2, py + ph / 2 + 2);
      if (pl.rotacao === 90) {
        doc.text("90°", px + pw - 8, py + 6);
      }
      doc.setTextColor(0, 0, 0);
    }

    // Furos da peça no layout PRO (círculos em escala), cores por tipo.
    const holes = pl.holes ?? [];
    if (holes.length > 0) {
      for (const h of holes) {
        const hxAbs = toLayoutAbsoluteX(pl.x_mm + h.x, sheet.largura_mm);
        const hx = originX + hxAbs * scale;
        const hy = py + h.y * scale;
        const hr = Math.max(0.25, (h.diameter / 2) * scale);
        const ht = (h as { holeType?: string }).holeType;
        if (ht === "prateleira") {
          doc.setDrawColor(34, 197, 94);
          doc.setFillColor(34, 197, 94);
        } else if (ht === "dobradica") {
          doc.setDrawColor(249, 115, 22);
          doc.setFillColor(249, 115, 22);
        } else if (ht === "dobradica_fixacao") {
          doc.setDrawColor(234, 88, 12);
          doc.setFillColor(234, 88, 12);
        } else if (ht === "dobradica_parafuso_uniao") {
          doc.setDrawColor(180, 83, 9);
          doc.setFillColor(251, 146, 60);
        } else if (ht === "cavilha") {
          doc.setDrawColor(59, 130, 246);
          doc.setFillColor(59, 130, 246);
        } else if (ht === "parafuso") {
          doc.setDrawColor(107, 114, 128);
          doc.setFillColor(107, 114, 128);
        } else if (ht === "corredica") {
          doc.setDrawColor(168, 85, 247);
          doc.setFillColor(168, 85, 247);
        } else {
          doc.setDrawColor(220, 38, 38);
          doc.setFillColor(220, 38, 38);
        }
        doc.setLineWidth(0.3);
        doc.circle(hx, hy, hr, "FD");
      }
      doc.setDrawColor(30, 64, 175);
    }
  }

  y = originY + drawH + 10;

  doc.setFontSize(9);
  doc.text(
    `Escala: 1:${Math.max(1, Math.round(1 / scale))} | Kerf visível pelo espaçamento entre peças`,
    MARGIN,
    y
  );
  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("🟢 Prateleira | 🟠 Dobradiça | 🟧 Fixação dobradiça | 🔵 Cavilha | ⚫ Parafuso | 🟣 Corrediça | 🔴 Outros", MARGIN, y);
  doc.setTextColor(0, 0, 0);
}
