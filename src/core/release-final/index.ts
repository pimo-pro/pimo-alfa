/**
 * src/core/release-final ù PIMO.PRO-V5 Release Final (Fase 20).
 * Consolida Modelo B, DXF, CNC, overlay, docs, pricing, kitchen, planner.
 * Nùo altera Modelo A nem src/industrial/**.
 */

export {
  PIMO_PRO_V5_VERSION,
  PIMO_PRO_V5_CODENAME,
  buildFinalVersionManifest,
  computeLogicalHash,
  type FinalVersionManifest,
  type ComponentStatus,
} from "./finalVersioning";

export {
  buildFinalDocumentation,
  type FinalDocumentationBundle,
} from "./finalDocumentation";

export {
  getModeloBProductAnnouncement,
  MODELO_B_PRODUCT_ANNOUNCEMENT,
} from "./productAnnouncement";

export {
  runFinalIntegrityCheck,
  type FinalIntegrityReport,
  type IntegrityCheckItem,
} from "./finalIntegrityCheck";

export {
  buildFinalReleaseReport,
  formatFinalReleaseReportText,
  type FinalReleaseReport,
  type ReleaseFinalStatus,
} from "./finalReport";

export {
  assemblePimoProV5FinalRelease,
  type FinalAssembledRelease,
  type AssembleFinalReleaseOptions,
} from "./finalAssembler";
