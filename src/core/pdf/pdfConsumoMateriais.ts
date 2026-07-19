/**
 * Wrapper legado — o PDF de consumo foi unificado em industrial_armazem.
 * Mantido para imports antigos; gera o PDF unificado (sem consumo por peça).
 */

import type jsPDF from "jspdf";
import type { ConsumoMateriaisSummary } from "../industrial/computeConsumoMateriais";
import type { ChapasRealSummary } from "../industrial/computeChapasReal";
import {
  buildIndustrialArmazemPdf,
  industrialArmazemPdfFileName,
} from "./pdfIndustrialArmazem";

export function consumoMateriaisPdfFileName(projectName: string): string {
  return industrialArmazemPdfFileName(projectName);
}

/** @deprecated Use buildIndustrialArmazemPdf */
export async function buildConsumoMateriaisPdf(
  projectName: string,
  summary: ConsumoMateriaisSummary,
  chapas?: ChapasRealSummary
): Promise<jsPDF> {
  const chapasFallback: ChapasRealSummary = chapas ?? {
    totalSheets: summary.porChapa.length,
    totalWasteMm2: summary.desperdicioTotalMm2,
    totalWastePct: summary.desperdicioTotalPct,
    sheets: summary.porChapa.map((r) => ({
      sheetIndex: r.chapaIndex,
      espessuraMm: r.espessuraMm,
      material: r.material,
      sheetLarguraMm: 0,
      sheetAlturaMm: 0,
      pieceCount: 0,
      usedAreaMm2: r.areaUsadaMm2,
      sheetAreaMm2: r.areaChapaMm2,
      wasteMm2: r.desperdicioMm2,
      wastePct: r.desperdicioPct,
      pieces: [],
    })),
    layout: null,
  };
  return buildIndustrialArmazemPdf(projectName, chapasFallback, summary);
}
