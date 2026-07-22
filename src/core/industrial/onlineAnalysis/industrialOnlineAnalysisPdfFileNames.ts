/**
 * Nomes estáveis dos PDFs / ZIP documentais da Análise (Fase 4).
 * Alinhados aos nomes dos PDFs no ZIP clássico; o pacote Fase 4 — só PDFs.
 */

import { sanitizeExportFilename } from "@/utils/sanitization";
import type { IndustrialOnlineAnalysisDocId } from "./industrialOnlineAnalysisDocs";

export function industrialAnalysisProjectSlug(projectName: string): string {
  const slug = sanitizeExportFilename(projectName.trim() || "projeto").replace(/\s+/g, "_");
  return slug || "projeto";
}

export function industrialOnlineAnalysisPdfFileName(
  projectName: string,
  docId: IndustrialOnlineAnalysisDocId
): string {
  return `${industrialAnalysisProjectSlug(projectName)}_${docId}.pdf`;
}

export function industrialOnlineAnalysisPdfsZipFileName(
  projectName: string,
  rowsMode: "effective" | "canonical"
): string {
  const slug = industrialAnalysisProjectSlug(projectName);
  return rowsMode === "canonical"
    ? `${slug}_analise_pdfs_originais.zip`
    : `${slug}_analise_pdfs.zip`;
}
