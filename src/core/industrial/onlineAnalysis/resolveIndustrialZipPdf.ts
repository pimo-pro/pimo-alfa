import type { ProjectState } from "@/context/projectTypes";
import type { IndustrialOnlineAnalysisDocId } from "./industrialOnlineAnalysisDocs";
import { documentHasOverrides } from "./applyIndustrialDocumentOverrides";
import { getEffectiveRowsForDoc } from "./buildIndustrialOnlineAnalysisView";
import { buildPdfFromOnlineAnalysisView } from "./buildPdfFromOnlineAnalysisView";

type PdfLike = { output: (_type: string) => ArrayBuffer | Uint8Array };

/**
 * Se existirem overrides para o docId, gera PDF a partir das rows efetivas.
 * Caso contrário, usa o builder clássico (fallback).
 * CNC/TCN não passam por aqui. Etiquetas UEE usam
 * applyDocumentaryOverridesToCutlistForEtiquetas (só cutlist whitelist).
 */
export async function resolveIndustrialZipPdf(
  project: ProjectState,
  docId: IndustrialOnlineAnalysisDocId,
  fallback: () => PdfLike | Promise<PdfLike>
): Promise<PdfLike> {
  if (documentHasOverrides(project.industrialDocumentOverrides, docId)) {
    const view = getEffectiveRowsForDoc(project, docId);
    return buildPdfFromOnlineAnalysisView(view);
  }
  return fallback();
}
