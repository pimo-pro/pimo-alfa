/**
 * Geração de um PDF industrial a partir da vista tabular (Fase 4).
 * effective = overrides; canonical = tabular sem overrides.
 * Não toca CNC/TCN/drill/etiquetas nem no ZIP clássico.
 */

import type jsPDF from "jspdf";
import type { ProjectState } from "@/context/projectTypes";
import {
  buildIndustrialOnlineAnalysisView,
  getEffectiveRowsForDoc,
} from "./buildIndustrialOnlineAnalysisView";
import { buildPdfFromOnlineAnalysisView } from "./buildPdfFromOnlineAnalysisView";
import type { IndustrialOnlineAnalysisDocId } from "./industrialOnlineAnalysisDocs";

export type IndustrialOnlineAnalysisPdfRowsMode = "effective" | "canonical";

export function getCanonicalRowsForDoc(
  project: ProjectState,
  docId: IndustrialOnlineAnalysisDocId,
  options?: { showPrices?: boolean }
) {
  return buildIndustrialOnlineAnalysisView(project, docId, {
    ...options,
    applyOverrides: false,
  });
}

export function generateIndustrialOnlineAnalysisPdf(
  project: ProjectState,
  docId: IndustrialOnlineAnalysisDocId,
  options?: { rowsMode?: IndustrialOnlineAnalysisPdfRowsMode; showPrices?: boolean }
): jsPDF {
  const rowsMode = options?.rowsMode ?? "effective";
  const view =
    rowsMode === "canonical"
      ? getCanonicalRowsForDoc(project, docId, options)
      : getEffectiveRowsForDoc(project, docId, options);
  return buildPdfFromOnlineAnalysisView(view);
}
