/**
 * european/release — Release Notes Auto-Generator (Modelo B, Fase 14).
 */

export {
  collectEuropeanReleaseEvents,
  EUROPEAN_RELEASE_PHASE_CATALOG,
} from "./releaseCollector";
export type { EuropeanReleaseEvent, EuropeanReleaseEventKind } from "./releaseCollector";

export {
  formatEuropeanReleaseSections,
  formatEuropeanReleaseText,
} from "./releaseFormatter";
export type {
  EuropeanReleaseSection,
  EuropeanReleaseSectionId,
} from "./releaseFormatter";

export {
  buildEuropeanReleaseNotes,
  EUROPEAN_RELEASE_VERSION,
  EUROPEAN_RELEASE_AUTHOR,
} from "./releaseBuilder";
export type { EuropeanReleaseNotes } from "./releaseBuilder";

export { buildReleaseReport, formatReleaseReportText } from "./releaseReport";
export type { EuropeanReleaseReport, EuropeanReleaseStatus } from "./releaseReport";
