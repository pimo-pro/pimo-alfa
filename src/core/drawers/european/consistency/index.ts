/**
 * european/consistency — Consistência industrial absoluta de nomes/códigos (Modelo B).
 */

export {
  EUROPEAN_INDUSTRIAL_CODES,
  EUROPEAN_INDUSTRIAL_NAMES,
  EUROPEAN_CODE_ALIASES,
  isCanonicalEuropeanCode,
  resolveBaseCode,
  resolveIndexedCode,
  displayNameForBaseCode,
  type EuropeanIndustrialBaseCode,
} from "./namingMap";

export {
  enforceNaming,
  inferDrawerIndexFromCodigo,
  type EuropeanPieceIdentity,
  type EuropeanPieceIdentityInput,
} from "./enforceNaming";

export { enforceCutlistIdentity } from "./enforceCutlistIdentity";
export { enforcePdfIdentity } from "./enforcePdfIdentity";
export { enforceDrillingIdentity } from "./enforceDrillingIdentity";
export { enforceViewerIdentity } from "./enforceViewerIdentity";
export {
  enforcePieceIdentity,
  geometryIdentityTags,
  type GeometryIdentityTags,
} from "./enforcePieceIdentity";
