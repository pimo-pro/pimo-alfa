/**
 * Politica PDF industrial:
 * P1 — pacote binario por projeto (shell se houver overrides; senao classico).
 * P2 — excepcao de apresentacao: alguns docs usam SEMPRE o builder classico rico
 *      (ex. ferragens_totais: landscape + normalize), mesmo com overrides noutros docs.
 * CNC/TCN/drill/nesting fora de ambito.
 */
import type { ProjectState } from "@/context/projectTypes";
import { anyDocumentHasOverrides } from "./applyIndustrialDocumentOverrides";
import type { IndustrialOnlineAnalysisDocId } from "./industrialOnlineAnalysisDocs";

export type IndustrialPdfRenderMode = "shell" | "classic";

/**
 * Docs com apresentacao industrial canonica — nunca shell.
 * Sempre buildClassicIndustrialPdf / buildFerragensTotaisPdf (+ normalize).
 */
export const INDUSTRIAL_CLASSIC_PRESENTATION_DOC_IDS = [
  "ferragens_totais",
] as const satisfies readonly IndustrialOnlineAnalysisDocId[];

export type IndustrialClassicPresentationDocId =
  (typeof INDUSTRIAL_CLASSIC_PRESENTATION_DOC_IDS)[number];

export function mustUseClassicIndustrialPdf(
  docId: IndustrialOnlineAnalysisDocId
): boolean {
  return (INDUSTRIAL_CLASSIC_PRESENTATION_DOC_IDS as readonly string[]).includes(docId);
}

/** Modo global do projeto (P1). Ignora excepcoes por doc. */
export function getIndustrialPdfRenderMode(
  project: ProjectState
): IndustrialPdfRenderMode {
  return anyDocumentHasOverrides(project.industrialDocumentOverrides)
    ? "shell"
    : "classic";
}

export function shouldUseShellIndustrialPdfs(project: ProjectState): boolean {
  return getIndustrialPdfRenderMode(project) === "shell";
}

/**
 * Decisao por documento (P1 + P2).
 * ferragens_totais ? sempre classico, mesmo com overrides noutros docs.
 */
export function shouldUseShellIndustrialPdfForDoc(
  project: ProjectState,
  docId: IndustrialOnlineAnalysisDocId
): boolean {
  if (mustUseClassicIndustrialPdf(docId)) return false;
  return shouldUseShellIndustrialPdfs(project);
}
