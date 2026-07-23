import type jsPDF from "jspdf";
import type { ProjectState } from "../../context/projectTypes";
import type { MaterialIndustrial } from "../manufacturing/materials";
import type { IndustrialPieceEditsStore } from "../industrial/industrialPieceEditsTypes";
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

type ResumoProjectSlice = Pick<
  ProjectState,
  | "boxes"
  | "rules"
  | "materialId"
  | "projectName"
  | "remates"
  | "rodapes"
  | "extractedPartsByBoxId"
> & { industrialPieceEdits?: IndustrialPieceEditsStore };

export function buildResumoFinanceiroPdf(
  project: ResumoProjectSlice,
  materials: MaterialIndustrial[],
  showPrices: boolean
): jsPDF {
  const projectName = project.projectName?.trim() || "Projeto";
  const meta = resolveIndustrialSectionPdfMeta("Resumo Financeiro — Detalhado", projectName);
  const { summary, pecas } = buildResumoFinanceiroPdfRows(project, materials, showPrices);

  const doc = createIndustrialSectionPdf(meta, [["Indicador", "Valor"]], summary);

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
  project: ResumoProjectSlice,
  materials: MaterialIndustrial[],
  showPrices: boolean
): void {
  const projectName = project.projectName?.trim() || "Projeto";
  const meta = resolveIndustrialSectionPdfMeta("Resumo Financeiro — Detalhado", projectName);
  const { summary } = buildResumoFinanceiroPdfRows(project, materials, showPrices);
  doc.addPage("a4", "portrait");
  const y = drawIndustrialSectionPdfHeader(doc, meta);
  drawIndustrialSectionTable(doc, y, [["Indicador", "Valor"]], summary);
}
