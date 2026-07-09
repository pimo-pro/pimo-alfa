/**
 * UnifiedEtiquetaEngine (UEE) — orquestrador de etiquetas PIMO.PRO (motor v5).
 *
 * SSOT config: `@/core/labelSystem/resolveLabelSystemConfig`
 * SSOT render: `@/core/pdf/pdfEtiquetas` (via UEE.build)
 *
 * @see docs/architecture/etiquetas-ssot.md
 */

export { UnifiedEtiquetaEngine } from "./engine/UnifiedEtiquetaEngine";
export type { UnifiedEtiquetaProjectInput } from "./types";
/** @deprecated Usar `resolveLabelSystemConfig` de `@/core/labelSystem`. */
export { resolveUnifiedLabelConfig } from "./config/unifiedLabelConfig";
export { normalizeCutLayoutPlacements } from "./engine/nestingAdapter";
export {
  orderLabelsByNestingPlacements,
  assignUniqueEtiquetaNumbers,
  assertUniqueEtiquetaNumbers,
  prepareEtiquetasForPrint,
  nestingPlacementPrintOrder,
} from "./engine/nestingLabelOrder";
export { fitLabelTextInBox, drawAutoFitLabelText } from "./render/labelTextAutoFit";
export { shouldUseDesignerInProductionExport } from "./ui/designerPreview";
export * from "./qr/etiquetaQr";
export * from "./data/measures";
export * from "./data/observations";
export * from "./data/sequence";
export * from "./data/numCaixa";
