import type jsPDF from "jspdf";
import type { ProjectState } from "../../context/projectTypes";
import type { MaterialIndustrial } from "../manufacturing/materials";
import type { IndustrialPieceEditsStore } from "../industrial/industrialPieceEditsTypes";
import { buildTotaisProjetoPdfRows } from "../industrial/industrialBottomSectionData";
import {
  createIndustrialSectionPdf,
  drawIndustrialSectionPdfHeader,
  drawIndustrialSectionTable,
  industrialSectionPdfFileName,
  resolveIndustrialSectionPdfMeta,
} from "./pdfIndustrialSectionShell";

export function totaisProjetoPdfFileName(projectName: string): string {
  return industrialSectionPdfFileName(projectName, "totais_projeto");
}

export type TotaisProjetoPdfExtras = {
  totalOrlaMetros?: number;
  custoTotalOrla?: number;
  custoTotalRemates?: number;
  custoTotalPaineis?: number;
  custoTotalPortas?: number;
  custoTotalGavetas?: number;
  custoTotalFerragens?: number;
  custoTotal?: number;
};

type TotaisProjectSlice = Pick<
  ProjectState,
  | "boxes"
  | "rules"
  | "materialId"
  | "projectName"
  | "remates"
  | "rodapes"
  | "extractedPartsByBoxId"
> & { industrialPieceEdits?: IndustrialPieceEditsStore };

export function buildTotaisProjetoPdf(
  project: TotaisProjectSlice,
  materials: MaterialIndustrial[],
  showPrices: boolean,
  extras?: TotaisProjetoPdfExtras
): jsPDF {
  const projectName = project.projectName?.trim() || "Projeto";
  const meta = resolveIndustrialSectionPdfMeta("Totais do Projeto", projectName);
  const rows = buildTotaisProjetoPdfRows(project, materials, showPrices, extras);
  return createIndustrialSectionPdf(meta, [["Métrica", "Valor"]], rows);
}

export function appendTotaisProjetoSection(
  doc: jsPDF,
  project: TotaisProjectSlice,
  materials: MaterialIndustrial[],
  showPrices: boolean,
  extras?: TotaisProjetoPdfExtras
): void {
  const projectName = project.projectName?.trim() || "Projeto";
  const meta = resolveIndustrialSectionPdfMeta("Totais do Projeto", projectName);
  const rows = buildTotaisProjetoPdfRows(project, materials, showPrices, extras);
  doc.addPage("a4", "portrait");
  const y = drawIndustrialSectionPdfHeader(doc, meta);
  drawIndustrialSectionTable(doc, y, [["Métrica", "Valor"]], rows);
}
