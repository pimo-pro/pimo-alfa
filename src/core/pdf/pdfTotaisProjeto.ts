/**
 * P3.5 — totais_projeto.pdf é alias do Resumo Financeiro — Detalhado (SSOT).
 * Mantido para compatibilidade de nomes de ficheiro no ZIP / análise online.
 */

import type jsPDF from "jspdf";
import type { MaterialIndustrial } from "../manufacturing/materials";
import {
  buildResumoFinanceiroPdf,
  appendResumoFinanceiroSection,
  type ResumoProjectSlice,
} from "./pdfResumoFinanceiro";
import { industrialSectionPdfFileName } from "./pdfIndustrialSectionShell";

export function totaisProjetoPdfFileName(projectName: string): string {
  return industrialSectionPdfFileName(projectName, "totais_projeto");
}

/** @deprecated P3.5 — extras ignorados; conteúdo vem do SSOT financeiro. */
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

/** Alias do slice financeiro — campos novos opcionais (Partial no Resumo). */
type TotaisProjectSlice = ResumoProjectSlice;

export function buildTotaisProjetoPdf(
  project: TotaisProjectSlice,
  materials: MaterialIndustrial[],
  showPrices: boolean,
  _extras?: TotaisProjetoPdfExtras
): jsPDF {
  return buildResumoFinanceiroPdf(project, materials, showPrices);
}

export function appendTotaisProjetoSection(
  doc: jsPDF,
  project: TotaisProjectSlice,
  materials: MaterialIndustrial[],
  showPrices: boolean,
  _extras?: TotaisProjetoPdfExtras
): void {
  appendResumoFinanceiroSection(doc, project, materials, showPrices);
}
