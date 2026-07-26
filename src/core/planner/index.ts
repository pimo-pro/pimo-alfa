/**
 * src/core/planner — Kitchen Planner (modo cliente, Fase 19).
 * Camada de composição visual sobre a Kitchen Library.
 * Não altera Modelo A, industrial/**, geometry, DXF ou CNC.
 */

export {
  buildPlannerGrid,
  snapToGrid,
  clampToGrid,
  resolveWallZone,
  PLANNER_SNAP_MM,
  DEFAULT_PLANNER_GRID,
  type PlannerGrid,
  type PlannerGridConfig,
  type PlannerWallZone,
} from "./plannerGrid";

export {
  buildPlacementRules,
  suggestedElevationYMm,
  frontAlignmentOffsetMm,
  DEFAULT_PLACEMENT_RULES,
  type PlannerPlacementRules,
} from "./plannerPlacement";

export {
  createPlacedModule,
  movePlacedModule,
  detectCollisions,
  autoAlignBaseRow,
  addModuleToPlan,
  findModuleSpec,
  nextPlannerInstanceId,
  resetPlannerInstanceSeqForTests,
  type PlannerPlacedModule,
  type PlannerCollision,
} from "./plannerModules";

export {
  buildPlannerMeasurements,
  type PlannerMeasurements,
  type PlannerGapMeasure,
} from "./plannerMeasurements";

export {
  buildPlannerPricing,
  type PlannerPricingSummary,
} from "./plannerPricing";

export {
  buildPlannerExport,
  formatPlannerExportText,
  downloadPlannerExportJson,
  type PlannerExportPackage,
} from "./plannerExport";

export {
  buildPlannerReport,
  formatPlannerReportText,
  type PlannerReport,
  type PlannerStatus,
} from "./plannerReport";

export {
  createPlannerState,
  plannerAddModule,
  plannerMoveModule,
  plannerRemoveModule,
  plannerSelectModule,
  plannerAutoAlign,
  plannerBuildExport,
  type PlannerState,
} from "./plannerState";
