import type jsPDF from "jspdf";
import type { BoxModule } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import type { MaterialIndustrial } from "../manufacturing/materials";
import { buildResumoFinanceiroPdfRows } from "../industrial/industrialBottomSectionData";
import {
  createIndustrialSectionPdf,
  drawIndustrialSectionPdfHeader,
  drawIndustrialSectionTable,
  industrialSectionPdfFileName,
  resolveIndustrialSectionPdfMeta,
} from "./pdfIndustrialSectionShell";

export function resumoFinanceiroPdfFileName(projectName: string): string {
  return industrialSectionPdfFileName(projectName, "resumo_financeiro");
}

export function buildResumoFinanceiroPdf(
  boxes: BoxModule[],
  rules: RulesConfig,
  materialId: string | undefined,
  projectName: string,
  materials: MaterialIndustrial[],
  showPrices: boolean
): jsPDF {
  const meta = resolveIndustrialSectionPdfMeta("Resumo Financeiro — Detalhado", projectName);
  const { summary, pecas } = buildResumoFinanceiroPdfRows(
    boxes,
    rules,
    materialId,
    projectName,
    materials,
    showPrices
  );

  const doc = createIndustrialSectionPdf(
    meta,
    [["Indicador", "Valor"]],
    summary
  );

  const y = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80;
  drawIndustrialSectionTable(
    doc,
    y + 8,
    [["Caixa", "Tipo", "Dimensões", "Qtd", "Material"]],
    pecas,
    { fontSize: 9 }
  );
  return doc;
}

export function appendResumoFinanceiroSection(
  doc: jsPDF,
  boxes: BoxModule[],
  rules: RulesConfig,
  materialId: string | undefined,
  projectName: string,
  materials: MaterialIndustrial[],
  showPrices: boolean
): void {
  const meta = resolveIndustrialSectionPdfMeta("Resumo Financeiro — Detalhado", projectName);
  const { summary } = buildResumoFinanceiroPdfRows(
    boxes,
    rules,
    materialId,
    projectName,
    materials,
    showPrices
  );
  doc.addPage("a4", "portrait");
  const y = drawIndustrialSectionPdfHeader(doc, meta);
  drawIndustrialSectionTable(doc, y, [["Indicador", "Valor"]], summary);
}
