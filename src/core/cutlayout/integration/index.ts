/**
 * Integração CutLayout ↔ consumidores industriais e Nesting V3.
 *
 * Etapa 1: industrialLayoutContract (activo)
 * Etapas 2+: adapters V3 (planeados — ver documentação em cada módulo)
 */

export {
  finalizeIndustrialLayout,
  validateIndustrialLayout,
  type IndustrialLayoutFinalizeOptions,
  type IndustrialLayoutFinalizeDeps,
  type IndustrialLayoutFinalizeMode,
  type IndustrialLayoutPocketFillingProfile,
  type IndustrialLayoutValidateOptions,
  type IndustrialLayoutValidationResult,
  type IndustrialLayoutValidationIssue,
  type IndustrialLayoutValidationIssueCode,
  type IndustrialLayoutCoordinateFrame,
} from "./industrialLayoutContract";
