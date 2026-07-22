import { buildProjetosPagePath, toProjetosPageSlug } from "@/app/PROJETOS/projetosPageSlug";
import type { IndustrialOnlineAnalysisDocId } from "./industrialOnlineAnalysisDocs";

export function buildIndustrialOnlineAnalysisIndexPath(projectName: string): string {
  return `${buildProjetosPagePath({ name: toProjetosPageSlug(projectName) })}/analise`;
}

export function buildIndustrialOnlineAnalysisDocPath(
  projectName: string,
  docId: IndustrialOnlineAnalysisDocId
): string {
  return `${buildIndustrialOnlineAnalysisIndexPath(projectName)}/${docId}`;
}
