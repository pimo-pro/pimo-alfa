import type jsPDF from "jspdf";
import { resolveLabelSystemConfig } from "../../labelSystem/resolveLabelSystemConfig";
import { normalizeCutLayoutPlacements } from "./nestingAdapter";
import { shouldUseDesignerInProductionExport } from "../ui/designerPreview";
import type { UnifiedEtiquetaProjectInput } from "../types";
import {
  buildProductionEtiquetasV5Pdf,
  buildEtiquetasPdfLegacy,
  type ProjectForEtiquetasPdf,
} from "../../pdf/pdfEtiquetas";

/**
 * UnifiedEtiquetaEngine (UEE) — hub único de etiquetas de produção (motor v5).
 * Usa `resolveLabelSystemConfig` como única fonte de configuração (LabelSystemV5).
 */
export const UnifiedEtiquetaEngine = {
  /**
   * Gera PDF de etiquetas de produção (sempre v5 unificado).
   * Ignora designer em produção; S1/S3 só via `buildLegacy`.
   */
  async build(project: UnifiedEtiquetaProjectInput): Promise<jsPDF> {
    const pdfProject = toPdfProject(project);

    if (shouldUseDesignerInProductionExport(project.designerConfig)) {
      return buildEtiquetasPdfLegacy(pdfProject);
    }

    // F5: usar resolveLabelSystemConfig como única fonte de configuração.
    // Fallback automático para regras legadas quando labelSystemV5 está ausente.
    const runtime = resolveLabelSystemConfig(
      project.rules,
      project.settings ?? null,
      project.labelSystemV5 ?? project.rules.labelSystemV5 ?? null
    );
    const placements = normalizeCutLayoutPlacements(project.cutLayoutPlacements);

    return buildProductionEtiquetasV5Pdf(
      { ...pdfProject, cutLayoutPlacements: placements },
      runtime
    );
  },

  /** Sistemas legados (S1 + S3 + flag v5) — isolados para regressão. */
  async buildLegacy(project: UnifiedEtiquetaProjectInput): Promise<jsPDF> {
    return buildEtiquetasPdfLegacy(toPdfProject(project));
  },
};

function toPdfProject(project: UnifiedEtiquetaProjectInput): ProjectForEtiquetasPdf {
  return {
    projectName: project.projectName,
    boxes: project.boxes,
    rules: project.rules,
    materialId: project.materialId,
    extractedPartsByBoxId: project.extractedPartsByBoxId,
    settings: project.settings,
    cutLayoutPlacements: project.cutLayoutPlacements,
    designerConfig: project.designerConfig,
    precomputedItems: project.precomputedItems,
    orlaPiecesByPanelId: project.orlaPiecesByPanelId,
  };
}
