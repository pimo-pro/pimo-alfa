/**
 * Integração CutLayout ↔ consumidores industriais e Nesting V3.
 *
 * Etapa 1: industrialLayoutContract
 * Etapa 2: adapters V3 (layoutCoordinateAdapter, v3ToCutPieces, cutLayoutResultToV3State)
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

export { v3PiecesToCutPieces } from "./v3ToCutPieces";
export { cutLayoutResultToV3State } from "./cutLayoutResultToV3State";
export {
  cutPlacementToV3Placement,
  v3PlacementToCutPlacement,
  physicalBlToV3TopLeft,
  v3TopLeftToPhysicalBl,
  solverUsableToPhysicalBl,
  physicalBlToSolverUsable,
  coordinatesWithinTolerance,
  type LayoutCoordinateFrame,
} from "./layoutCoordinateAdapter";
