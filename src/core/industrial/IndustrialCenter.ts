/**
 * P3 ù Fachada IndustrialCenter (Opcao A: classic-first).
 *
 * Camada unica de acesso a:
 *   A) Dados SSOT (live ProjectState + cutlist canonica)
 *   B) Apresentacao PDF (resolve + classic presentation)
 *   C) Maquina (CNC/TCN/drill/nesting) ù cutlist base + pieceEdits, SEM overrides documentais
 *
 * Thin wrappers: nao duplica logica; redireciona para os modulos SSOT existentes.
 */
import type { ProjectState } from "@/context/projectTypes";
import type { CutListItemComPreco } from "../types";
import {
  buildCutlistItemsForIndustrialExport,
  type IndustrialExportProjectSnapshot,
} from "../fabrication/buildCutlistItemsForIndustrialExport";
import {
  applyDocumentaryOverridesToCutlistForEtiquetas,
} from "./onlineAnalysis/applyDocumentaryOverridesToCutlistForEtiquetas";
import {
  getIndustrialLiveProject,
  publishIndustrialLiveProject,
  clearIndustrialLiveProject,
} from "./onlineAnalysis/industrialLiveProjectStore";
import {
  buildIndustrialOnlineAnalysisView,
  getEffectiveRowsForDoc,
} from "./onlineAnalysis/buildIndustrialOnlineAnalysisView";
import type { IndustrialOnlineAnalysisDocId } from "./onlineAnalysis/industrialOnlineAnalysisDocs";
import { buildClassicIndustrialPdf } from "./onlineAnalysis/buildClassicIndustrialPdf";
import {
  resolveIndustrialZipPdf,
  type IndustrialPdfDoc,
  type ResolveIndustrialPdfOptions,
} from "./onlineAnalysis/resolveIndustrialZipPdf";
import { downloadIndustrialOnlineAnalysisPdfs } from "./onlineAnalysis/downloadIndustrialOnlineAnalysisPdfs";

export type IndustrialCutlistMode = "canonical" | "withPieceEdits";

function toExportSnapshot(
  project: ProjectState,
  mode: IndustrialCutlistMode
): IndustrialExportProjectSnapshot {
  return {
    boxes: project.boxes ?? [],
    rules: project.rules,
    materialId: project.materialId,
    projectName: project.projectName ?? "Projeto",
    remates: project.remates ?? [],
    rodapes: project.rodapes ?? [],
    extractedPartsByBoxId: project.extractedPartsByBoxId,
    industrialPieceEdits:
      mode === "withPieceEdits" ? project.industrialPieceEdits : undefined,
  };
}

/** ProjectState live (editor ? /analise). */
export function getLiveState(): ProjectState | null {
  return getIndustrialLiveProject()?.state ?? null;
}

export function publishLiveState(state: ProjectState): void {
  publishIndustrialLiveProject(state);
}

export function clearLiveState(): void {
  clearIndustrialLiveProject();
}

/**
 * Cutlist unica industrial.
 * - canonical: export sem pieceEdits (raro; testes)
 * - withPieceEdits: fonte padrao (PDF classico, hubs, nesting pecas)
 */
export function getCutlist(
  project: ProjectState,
  mode: IndustrialCutlistMode = "withPieceEdits"
): CutListItemComPreco[] {
  return buildCutlistItemsForIndustrialExport(toExportSnapshot(project, mode));
}

/**
 * Items para CNC/TCN/drill/nesting.
 * Sempre cutlist base + pieceEdits. NUNCA overrides documentais.
 */
export function getCncItems(project: ProjectState): CutListItemComPreco[] {
  return getCutlist(project, "withPieceEdits");
}

/**
 * Items UEE: cutlist + whitelist documental (material/qtd/obs/ù).
 * Geometria CNC permanece em getCncItems().
 */
export function getUeeItems(project: ProjectState): CutListItemComPreco[] {
  const base = getCncItems(project);
  return applyDocumentaryOverridesToCutlistForEtiquetas(
    base,
    project.industrialDocumentOverrides
  );
}

/** Vista tabular /analise (canonical = sem overrides; effective = com). */
export function getDocView(
  project: ProjectState,
  docId: IndustrialOnlineAnalysisDocId,
  mode: "canonical" | "effective" = "effective",
  options?: { showPrices?: boolean }
) {
  if (mode === "canonical") {
    return buildIndustrialOnlineAnalysisView(project, docId, {
      ...options,
      applyOverrides: false,
    });
  }
  return getEffectiveRowsForDoc(project, docId, options);
}

/**
 * PDF industrial (P1+P2+P3 classic-first): resolve + builder classico.
 */
export async function renderPdf(
  project: ProjectState,
  docId: IndustrialOnlineAnalysisDocId,
  options?: ResolveIndustrialPdfOptions & { showPrices?: boolean }
): Promise<IndustrialPdfDoc> {
  return resolveIndustrialZipPdf(
    project,
    docId,
    () =>
      buildClassicIndustrialPdf(project, docId, {
        showPrices: options?.showPrices,
      }),
    options
  );
}

/** Download seletivo de PDFs industriais (1 blob ou ZIP documental). */
export async function exportDocumentaryPdfs(
  project: ProjectState,
  docIds: IndustrialOnlineAnalysisDocId[],
  options?: { rowsMode?: "effective" | "canonical"; showPrices?: boolean }
) {
  return downloadIndustrialOnlineAnalysisPdfs(project, docIds, options);
}

export const IndustrialCenter = {
  getLiveState,
  publishLiveState,
  clearLiveState,
  getCutlist,
  getCncItems,
  getUeeItems,
  getDocView,
  renderPdf,
  exportDocumentaryPdfs,
} as const;
