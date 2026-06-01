/**
 * UnifiedEtiquetaEngine (UEE) — sistema único de etiquetas PIMO.PRO (motor v5).
 */

export { UnifiedEtiquetaEngine } from "./engine/UnifiedEtiquetaEngine";
export type { UnifiedEtiquetaProjectInput } from "./types";
export { resolveUnifiedLabelConfig } from "./config/unifiedLabelConfig";
export { normalizeCutLayoutPlacements } from "./engine/nestingAdapter";
export { shouldUseDesignerInProductionExport } from "./ui/designerPreview";
export * from "./qr/etiquetaQr";
export * from "./data/measures";
export * from "./data/observations";
export * from "./data/sequence";
export * from "./data/numCaixa";
