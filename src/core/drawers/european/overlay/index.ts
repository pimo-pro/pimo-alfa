/**
 * european/overlay — MC Overlay Advanced (Modelo B, Fase 13).
 * Camada somente-leitura: medidas, aberturas, remates, roda-pé, gaps.
 */

export { buildOverlayMeasures } from "./overlayMeasures";
export type { EuropeanOverlayMeasures } from "./overlayMeasures";

export { buildOverlayAberturas } from "./overlayAberturas";
export type { EuropeanOverlayAberturas, EuropeanOverlayAbertura } from "./overlayAberturas";

export { buildOverlayRemates } from "./overlayRemates";
export type { EuropeanOverlayRemates, EuropeanOverlayRemate } from "./overlayRemates";

export {
  buildOverlayRodaPe,
  OVERLAY_DEFAULT_RODAPE_HEIGHT_MM,
  OVERLAY_DEFAULT_RODAPE_RECESS_MM,
} from "./overlayRodaPe";
export type { EuropeanOverlayRodaPe } from "./overlayRodaPe";

export { buildOverlayGaps } from "./overlayGaps";
export type { EuropeanOverlayGaps, EuropeanOverlayGap } from "./overlayGaps";

export { buildEuropeanOverlay } from "./overlayBuilder";
export type {
  EuropeanOverlay,
  EuropeanOverlayDxfIntegration,
  EuropeanOverlayTechnicalIntegration,
} from "./overlayBuilder";

export { buildOverlayReport, formatOverlayReportText } from "./overlayReport";
export type { EuropeanOverlayReport, EuropeanOverlayStatus } from "./overlayReport";
