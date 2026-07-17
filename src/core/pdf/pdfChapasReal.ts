/**
 * Wrapper legado — o PDF de chapas foi unificado em industrial_armazem.
 * Mantido para imports antigos; gera o PDF unificado (sem páginas de peças).
 */

import type jsPDF from "jspdf";
import type { ChapasRealSummary } from "../industrial/computeChapasReal";
import type { ConsumoMateriaisSummary } from "../industrial/computeConsumoMateriais";
import {
  buildIndustrialArmazemPdf,
  industrialArmazemPdfFileName,
} from "./pdfIndustrialArmazem";

export function chapasRealPdfFileName(projectName: string): string {
  return industrialArmazemPdfFileName(projectName);
}

/** @deprecated Use buildIndustrialArmazemPdf */
export async function buildChapasRealPdf(
  projectName: string,
  summary: ChapasRealSummary,
  consumo?: ConsumoMateriaisSummary
): Promise<jsPDF> {
  const consumoFallback: ConsumoMateriaisSummary = consumo ?? {
    porPeca: [],
    porChapa: summary.sheets.map((s) => ({
      chapaIndex: s.sheetIndex,
      material: s.material,
      espessuraMm: s.espessuraMm,
      areaUsadaMm2: s.usedAreaMm2,
      areaChapaMm2: s.sheetAreaMm2,
      desperdicioMm2: s.wasteMm2,
      desperdicioPct: s.wastePct,
    })),
    desperdicioTotalMm2: summary.totalWasteMm2,
    desperdicioTotalPct: summary.totalWastePct,
  };
  return buildIndustrialArmazemPdf(projectName, summary, consumoFallback);
}
