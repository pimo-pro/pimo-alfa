import type jsPDF from "jspdf";
import type { BoxModule } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import type { MaterialIndustrial } from "../manufacturing/materials";
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

export function buildTotaisProjetoPdf(
  boxes: BoxModule[],
  rules: RulesConfig,
  materialId: string | undefined,
  projectName: string,
  materials: MaterialIndustrial[],
  showPrices: boolean,
  extras?: TotaisProjetoPdfExtras
): jsPDF {
  const meta = resolveIndustrialSectionPdfMeta("Totais do Projeto", projectName);
  const rows = buildTotaisProjetoPdfRows(
    boxes,
    rules,
    materialId,
    projectName,
    materials,
    showPrices,
    extras
  );
  return createIndustrialSectionPdf(meta, [["Métrica", "Valor"]], rows);
}

export function appendTotaisProjetoSection(
  doc: jsPDF,
  boxes: BoxModule[],
  rules: RulesConfig,
  materialId: string | undefined,
  projectName: string,
  materials: MaterialIndustrial[],
  showPrices: boolean,
  extras?: TotaisProjetoPdfExtras
): void {
  const meta = resolveIndustrialSectionPdfMeta("Totais do Projeto", projectName);
  const rows = buildTotaisProjetoPdfRows(
    boxes,
    rules,
    materialId,
    projectName,
    materials,
    showPrices,
    extras
  );
  doc.addPage("a4", "portrait");
  const y = drawIndustrialSectionPdfHeader(doc, meta);
  drawIndustrialSectionTable(doc, y, [["Métrica", "Valor"]], rows);
}
