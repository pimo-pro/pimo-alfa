/**
 * Politica PDF industrial:
 * P1 — pacote binario por projeto (shell se houver overrides; senao classico).
 * P2 — excepcao de apresentacao: docs na lista CLASSIC usam SEMPRE o builder classico rico.
 * P3 — Opcao A classic-first: TODOS os 9 docs industriais com builder rico entram na lista;
 *      shell tabular fica so na edicao online (/analise), nao no PDF de fabrico.
 * CNC/TCN/drill/nesting fora de ambito.
 */
import type { ProjectState } from "@/context/projectTypes";
import { anyDocumentHasOverrides } from "./applyIndustrialDocumentOverrides";
import {
  INDUSTRIAL_ONLINE_ANALYSIS_DOC_IDS,
  type IndustrialOnlineAnalysisDocId,
} from "./industrialOnlineAnalysisDocs";

export type IndustrialPdfRenderMode = "shell" | "classic";

/**
 * Docs com apresentacao industrial canonica — nunca shell no PDF.
 * Sempre buildClassicIndustrialPdf (ferragens_totais ? landscape + normalize).
 */
export const INDUSTRIAL_CLASSIC_PRESENTATION_DOC_IDS =
  INDUSTRIAL_ONLINE_ANALYSIS_DOC_IDS;

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
 * Decisao por documento (P1 + P2 + P3 classic-first).
 * Com a lista expandida, PDFs industriais nunca usam shell — so builders classicos.
 */
export function shouldUseShellIndustrialPdfForDoc(
  project: ProjectState,
  docId: IndustrialOnlineAnalysisDocId
): boolean {
  if (mustUseClassicIndustrialPdf(docId)) return false;
  return shouldUseShellIndustrialPdfs(project);
}
