/**
 * P3.5/P3.7 — Resumo Financeiro — Detalhado (A4 landscape).
 * Página 1: Painel Unificado (métricas + custos).
 * Página 2+: Financeiro peças (tabela SSOT).
 */

import jsPDF from "jspdf";
import type { ProjectState } from "../../context/projectTypes";
import type { MaterialIndustrial } from "../manufacturing/materials";
import type { IndustrialPieceEditsStore } from "../industrial/industrialPieceEditsTypes";
import {
  computeFinanceiroUnificado,
  financeiroCustoRows,
  financeiroMetricRows,
} from "../financeiro/financeiroUnificado";
import { formatCurrency } from "../../utils/formatting";
import {
  drawIndustrialSectionPdfHeader,
  drawIndustrialSectionTable,
  industrialSectionPdfFileName,
  resolveIndustrialSectionPdfMeta,
} from "./pdfIndustrialSectionShell";
import { appendFinanceiroPecasSection } from "./pdfFinanceiroPecas";

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
  | "ferragemOrla"
  | "financeiroOverrides"
  | "financeiroAdminSettings"
  | "orlaPieces"
  | "orlaPresets"
> & {
  industrialPieceEdits?: IndustrialPieceEditsStore;
};

function buildFinanceiroPdfBody(
  project: ResumoProjectSlice,
  materials: MaterialIndustrial[],
  showPrices: boolean
): string[][] {
  const snap = computeFinanceiroUnificado(project, materials);
  const rows: string[][] = financeiroMetricRows(snap).map(([k, v]) => [k, v]);

  if (showPrices) {
    rows.push(["—", "—"]);
    for (const row of financeiroCustoRows(snap)) {
      const valor =
        row.emBreve || row.valor == null
          ? "em breve"
          : formatCurrency(row.valor, { placement: "prefix", empty: "—" });
      rows.push([row.label, valor]);
    }
  }

  return rows;
}

/** PDF standalone: Painel Unificado + Financeiro peças (A4 landscape). */
export function buildResumoFinanceiroPdf(
  project: ResumoProjectSlice,
  materials: MaterialIndustrial[],
  showPrices: boolean
): jsPDF {
  const projectName = project.projectName?.trim() || "Projeto";
  const meta = resolveIndustrialSectionPdfMeta("Resumo Financeiro — Detalhado", projectName);
  const body = buildFinanceiroPdfBody(project, materials, showPrices);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const y = drawIndustrialSectionPdfHeader(doc, meta);
  drawIndustrialSectionTable(doc, y, [["Indicador", "Valor"]], body, { fontSize: 10 });

  // P3.7 — secção Financeiro peças
  appendFinanceiroPecasSection(doc, project, materials, showPrices);
  return doc;
}

/** Secção para o PDF unificado — Painel Unificado + Financeiro peças. */
export function appendResumoFinanceiroSection(
  doc: jsPDF,
  project: ResumoProjectSlice,
  materials: MaterialIndustrial[],
  showPrices: boolean
): void {
  const projectName = project.projectName?.trim() || "Projeto";
  const meta = resolveIndustrialSectionPdfMeta("Resumo Financeiro — Detalhado", projectName);
  const body = buildFinanceiroPdfBody(project, materials, showPrices);
  doc.addPage("a4", "landscape");
  const y = drawIndustrialSectionPdfHeader(doc, meta);
  drawIndustrialSectionTable(doc, y, [["Indicador", "Valor"]], body, { fontSize: 10 });
  appendFinanceiroPecasSection(doc, project, materials, showPrices);
}

/**
 * Alias P3.5: totais_projeto.pdf passa a gerar o mesmo conteúdo do resumo unificado
 * (compatibilidade ZIP / links antigos).
 */
export function buildTotaisProjetoAsFinanceiroUnificadoPdf(
  project: ResumoProjectSlice,
  materials: MaterialIndustrial[],
  showPrices: boolean
): jsPDF {
  return buildResumoFinanceiroPdf(project, materials, showPrices);
}
