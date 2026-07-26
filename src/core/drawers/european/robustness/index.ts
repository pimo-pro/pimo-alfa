/**
 * european/robustness — Camada de proteção transparente (Modelo B).
 * Sem alterar regras de negócio nem resultados válidos.
 */

export {
  ensureFiniteNumber,
  ensureNonNegative,
  ensureDimensionPositive,
  ensureArray,
  isFinitePositive,
  isFiniteNonNegative,
  robustDebug,
  getRobustDebugLog,
  clearRobustDebugLog,
  type RobustDebugEntry,
} from "./safeNumbers";

export { ensureConfigSafe } from "./safeConfig";
export { sanitizeGeometry } from "./safeGeometry";
export { sanitizeCutlist } from "./safeCutlist";
export { sanitizeHoles } from "./safeDrilling";
export { sanitizePdfSection } from "./safePdf";
export { sanitizeViewerData } from "./safeViewer";
