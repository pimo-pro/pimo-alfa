import type { LabelDesignerConfig } from "../../labelDesigner/labelDesignerTypes";

/**
 * O Etiqueta Designer (S3) é apenas preview/admin — nunca substitui produção no UEE.
 */
export function shouldUseDesignerInProductionExport(_designerConfig?: LabelDesignerConfig): boolean {
  return false;
}

/** Para exportações Admin isoladas (labelDesignerExport). */
export function isDesignerAdminPreviewContext(): boolean {
  return true;
}
