import type jsPDF from "jspdf";
import type { ConsumoMateriaisSummary } from "../industrial/computeConsumoMateriais";
import {
  createIndustrialSectionPdf,
  drawIndustrialSectionPdfHeader,
  drawIndustrialSectionTable,
  industrialSectionPdfFileName,
  resolveIndustrialSectionPdfMeta,
} from "./pdfIndustrialSectionShell";

export function consumoMateriaisPdfFileName(projectName: string): string {
  return industrialSectionPdfFileName(projectName, "consumo_materiais");
}

export function buildConsumoMateriaisPdf(
  projectName: string,
  summary: ConsumoMateriaisSummary
): jsPDF {
  const meta = resolveIndustrialSectionPdfMeta("Consumo de Materiais", projectName);
  const resumo = [
    ["Desperdício total (mm²)", summary.desperdicioTotalMm2.toFixed(0)],
    ["Desperdício total (%)", `${summary.desperdicioTotalPct.toFixed(1)}%`],
    ["Peças", String(summary.porPeca.length)],
    ["Chapas", String(summary.porChapa.length)],
  ];

  const doc = createIndustrialSectionPdf(meta, [["Métrica", "Valor"]], resumo, { fontSize: 10 });

  doc.addPage("a4", "portrait");
  let y = drawIndustrialSectionPdfHeader(doc, { ...meta, sectionTitle: "Consumo por peça" });
  drawIndustrialSectionTable(
    doc,
    y,
    [["Caixa", "Peça", "Material", "Qtd", "Área", "Peso"]],
    summary.porPeca.map((r) => [
      r.caixa,
      r.peca,
      r.material,
      String(r.quantidade),
      `${(r.areaMm2 / 1_000_000).toFixed(4)} m²`,
      `${r.pesoKg.toFixed(3)} kg`,
    ]),
    { fontSize: 8 }
  );

  doc.addPage("a4", "portrait");
  y = drawIndustrialSectionPdfHeader(doc, { ...meta, sectionTitle: "Consumo por chapa" });
  drawIndustrialSectionTable(
    doc,
    y,
    [["Chapa", "Material", "Esp.", "Área usada", "Desperdício", "%"]],
    summary.porChapa.map((r) => [
      String(r.chapaIndex),
      r.material,
      `${r.espessuraMm} mm`,
      `${(r.areaUsadaMm2 / 1_000_000).toFixed(4)} m²`,
      `${(r.desperdicioMm2 / 1_000_000).toFixed(4)} m²`,
      `${r.desperdicioPct.toFixed(1)}%`,
    ]),
    { fontSize: 8 }
  );

  return doc;
}
