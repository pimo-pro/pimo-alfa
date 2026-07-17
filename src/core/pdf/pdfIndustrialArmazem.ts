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
 * PDF industrial unificado para armaz�m:
 * P�gina 1 � resumo + chapas por material/espessura (com log�tipo).
 * P�gina 2+ � consumo por chapa (sem pe�as / sem consumo por pe�a).
 */
export async function buildIndustrialArmazemPdf(
  projectName: string,
  chapas: ChapasRealSummary,
  consumo: ConsumoMateriaisSummary
): Promise<jsPDF> {
  const meta = resolveIndustrialSectionPdfMeta("Resumo industrial � Armaz�m", projectName);
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
    ["Chapas necess�rias", String(chapas.totalSheets)],
    ["Desperd�cio total (mm�)", chapas.totalWasteMm2.toFixed(0)],
    ["Desperd�cio total (%)", `${chapas.totalWastePct.toFixed(1)}%`],
    ["Pe�as totais", String(totalPecas)],
  ];
  drawIndustrialSectionTable(doc, y, [["M�trica", "Valor"]], resumo, { fontSize: 10 });
  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 28;
  y += 6;

  const porMaterial = aggregateChapasByMaterial(chapas);
  drawIndustrialSectionTable(
    doc,
    y,
    [["TOTAL Chapas", "Material", "Espessura"]],
    porMaterial.length > 0
      ? porMaterial
      : [[String(chapas.totalSheets), "� (estimativa)", "�"]],
    { fontSize: 10 }
  );

  doc.addPage("a4", "portrait");
  y = drawIndustrialSectionPdfBrandOnly(doc, "Consumo por chapa");
  drawIndustrialSectionTable(
    doc,
    y,
    [["Chapa", "Material", "Esp.", "�rea usada", "Desperd�cio", "%"]],
    consumo.porChapa.map((r) => [
      String(r.chapaIndex),
      r.material,
      `${r.espessuraMm} mm`,
      `${(r.areaUsadaMm2 / 1_000_000).toFixed(4)} m�`,
      `${(r.desperdicioMm2 / 1_000_000).toFixed(4)} m�`,
      `${r.desperdicioPct.toFixed(1)}%`,
    ]),
    { fontSize: 8 }
  );

  return doc;
}
