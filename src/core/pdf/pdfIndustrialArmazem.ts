import jsPDF from "jspdf";
import type { ChapasRealSummary } from "../industrial/computeChapasReal";
import type { ConsumoMateriaisSummary } from "../industrial/computeConsumoMateriais";
import { loadLogoIndustrialDataUrl } from "./logoIndustrialPublic";
import {
  drawIndustrialSectionPdfBrandOnly,
  drawIndustrialSectionPdfHeader,
  drawIndustrialSectionTable,
  industrialSectionPdfFileName,
  resolveIndustrialSectionPdfMeta,
} from "./pdfIndustrialSectionShell";

export function industrialArmazemPdfFileName(projectName: string): string {
  return industrialSectionPdfFileName(projectName, "industrial_armazem");
}

function aggregateChapasByMaterial(summary: ChapasRealSummary): string[][] {
  const map = new Map<string, { material: string; espessuraMm: number; total: number }>();
  for (const s of summary.sheets) {
    const key = `${s.material}||${s.espessuraMm}`;
    const prev = map.get(key);
    if (prev) prev.total += 1;
    else map.set(key, { material: s.material, espessuraMm: s.espessuraMm, total: 1 });
  }
  return [...map.values()]
    .sort((a, b) => a.material.localeCompare(b.material) || a.espessuraMm - b.espessuraMm)
    .map((r) => [String(r.total), r.material, `${r.espessuraMm} mm`]);
}

/**
 * PDF industrial unificado para armazùm:
 * Pùgina 1 ù resumo + chapas por material/espessura (com logùtipo).
 * Pùgina 2+ ù consumo por chapa (sem peùas / sem consumo por peùa).
 */
export async function buildIndustrialArmazemPdf(
  projectName: string,
  chapas: ChapasRealSummary,
  consumo: ConsumoMateriaisSummary
): Promise<jsPDF> {
  const meta = resolveIndustrialSectionPdfMeta("Resumo industrial ù Armazùm", projectName);
  const logoDataUrl = await loadLogoIndustrialDataUrl();
  const totalPecas =
    consumo.porPeca.reduce((s, r) => s + (r.quantidade || 0), 0) ||
    chapas.sheets.reduce((s, sh) => s + sh.pieceCount, 0);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = drawIndustrialSectionPdfHeader(doc, meta, {
    logoDataUrl,
    showLogo: true,
  });

  const resumo = [
    ["Chapas necessùrias", String(chapas.totalSheets)],
    ["Desperdùcio total (mmù)", chapas.totalWasteMm2.toFixed(0)],
    ["Desperdùcio total (%)", `${chapas.totalWastePct.toFixed(1)}%`],
    ["Peùas totais", String(totalPecas)],
  ];
  drawIndustrialSectionTable(doc, y, [["Mùtrica", "Valor"]], resumo, { fontSize: 10 });
  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 28;
  y += 6;

  const porMaterial = aggregateChapasByMaterial(chapas);
  drawIndustrialSectionTable(
    doc,
    y,
    [["TOTAL Chapas", "Material", "Espessura"]],
    porMaterial.length > 0
      ? porMaterial
      : [[String(chapas.totalSheets), "ù (estimativa)", "ù"]],
    { fontSize: 10 }
  );

  doc.addPage("a4", "portrait");
  y = drawIndustrialSectionPdfBrandOnly(doc, "Consumo por chapa");
  drawIndustrialSectionTable(
    doc,
    y,
    [["Chapa", "Material", "Esp.", "ùrea usada", "Desperdùcio", "%"]],
    consumo.porChapa.map((r) => [
      String(r.chapaIndex),
      r.material,
      `${r.espessuraMm} mm`,
      `${(r.areaUsadaMm2 / 1_000_000).toFixed(4)} mù`,
      `${(r.desperdicioMm2 / 1_000_000).toFixed(4)} mù`,
      `${r.desperdicioPct.toFixed(1)}%`,
    ]),
    { fontSize: 8 }
  );

  return doc;
}
