import type jsPDF from "jspdf";
import type { ChapasRealSummary } from "../industrial/computeChapasReal";
import {
  createIndustrialSectionPdf,
  drawIndustrialSectionPdfHeader,
  drawIndustrialSectionTable,
  industrialSectionPdfFileName,
  resolveIndustrialSectionPdfMeta,
} from "./pdfIndustrialSectionShell";

export function chapasRealPdfFileName(projectName: string): string {
  return industrialSectionPdfFileName(projectName, "chapas_real");
}

export function buildChapasRealPdf(projectName: string, summary: ChapasRealSummary): jsPDF {
  const meta = resolveIndustrialSectionPdfMeta("Cálculo de Chapas Real", projectName);
  const resumo = [
    ["Chapas necessárias", String(summary.totalSheets)],
    ["Desperdício total (mm²)", summary.totalWasteMm2.toFixed(0)],
    ["Desperdício total (%)", `${summary.totalWastePct.toFixed(1)}%`],
  ];

  const doc = createIndustrialSectionPdf(meta, [["Métrica", "Valor"]], resumo, { fontSize: 10 });

  for (const sheet of summary.sheets) {
    doc.addPage("a4", "portrait");
    const sheetMeta = {
      ...meta,
      sectionTitle: `Chapa ${sheet.sheetIndex} — ${sheet.material} ${sheet.espessuraMm}mm`,
    };
    const y = drawIndustrialSectionPdfHeader(doc, sheetMeta);
    const info = [
      ["Peças na chapa", String(sheet.pieceCount)],
      ["Área usada", `${(sheet.usedAreaMm2 / 1_000_000).toFixed(4)} m²`],
      ["Desperdício", `${sheet.wastePct.toFixed(1)}%`],
    ];
    drawIndustrialSectionTable(doc, y, [["Métrica", "Valor"]], info, { fontSize: 9 });
    const y2 = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;
    drawIndustrialSectionTable(
      doc,
      y2 + 4,
      [["Peça", "Caixa", "Largura", "Altura"]],
      sheet.pieces.map((p) => [p.nome, p.boxId, `${p.largura} mm`, `${p.altura} mm`]),
      { fontSize: 8 }
    );
  }

  if (summary.sheets.length === 0) {
    doc.addPage("a4", "portrait");
    const y = drawIndustrialSectionPdfHeader(doc, meta);
    drawIndustrialSectionTable(
      doc,
      y,
      [["Nota"]],
      [["Nesting indisponível — estimativa baseada em área total."]],
      { fontSize: 10 }
    );
  }

  return doc;
}
