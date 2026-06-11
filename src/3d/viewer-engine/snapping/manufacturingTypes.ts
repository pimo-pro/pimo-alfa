import type { AutoLayoutPlan } from "../autoLayout/autoLayoutTypes";
import type { AutoLayoutOpeningMm, AutoLayoutRoomBoundsMm } from "../autoLayout/autoLayoutTypes";
import type { RematePiece } from "../../../core/remate/rematePieceTypes";
import type { ProjectRodape } from "../../../core/rodape/rodapeTypes";
import type { WorkspaceBox } from "../../../core/types";

export type ManufacturingConflictSeverity = "info" | "warning" | "critical";

export type ManufacturingConflictKind =
  | "heightNonStandard"
  | "depthOutOfRange"
  | "depthInconsistent"
  | "remateMisaligned"
  | "rodapeGap"
  | "rodapeContinuity"
  | "doorClearance"
  | "drawerClearance"
  | "wallOpeningProximity"
  | "moduleSpacing";

export type ManufacturingConflict = {
  id: string;
  kind: ManufacturingConflictKind;
  severity: ManufacturingConflictSeverity;
  title: string;
  detail: string;
  boxIds: string[];
  remateIds?: string[];
  rodapeIds?: string[];
  suggestedFixId?: ManufacturingFixKind;
};

export type ManufacturingFixKind =
  | "depthAlign"
  | "rodapeContinuity"
  | "remateAlign"
  | "doorClearance"
  | "drawerClearance"
  | "wallClearance"
  | "distributeFlush";

export type ManufacturingSuggestion = {
  id: string;
  fixKind: ManufacturingFixKind;
  label: string;
  description: string;
  affectedBoxIds: string[];
};

export type ManufacturingScanResult = {
  score: number;
  readyForProduction: boolean;
  conflicts: ManufacturingConflict[];
  suggestions: ManufacturingSuggestion[];
  scannedAt: number;
  boxCount: number;
  remateCount: number;
  rodapeCount: number;
};

export type ManufacturingFixPlan = {
  label: string;
  plan: AutoLayoutPlan;
  appliedFixes: ManufacturingFixKind[];
  resolvedConflictIds: string[];
};

export type ManufacturingUiReport = {
  score: number;
  readyForProduction: boolean;
  summary: string;
  conflicts: ManufacturingConflict[];
  suggestions: ManufacturingSuggestion[];
  scannedAt: number;
};

export type ManufacturingFullReport = ManufacturingUiReport & {
  textReport: string;
  fixPlanAvailable: boolean;
};

export type ManufacturingScanContext = {
  boxes: WorkspaceBox[];
  remates: RematePiece[];
  rodapes: ProjectRodape[];
  bounds: AutoLayoutRoomBoundsMm | null;
  openings: AutoLayoutOpeningMm[];
  wallOffsetMm: number;
};

export const MANUFACTURING_THRESHOLDS = {
  standardBaseHeightMm: 720,
  standardUpperHeightMm: 720,
  heightToleranceMm: 15,
  depthMinMm: 500,
  depthMaxMm: 650,
  depthInconsistencyMm: 30,
  rodapeGapMaxMm: 1,
  doorClearanceMinMm: 3,
  drawerClearanceMinMm: 2,
  openingMarginMm: 120,
  moduleMinGapMm: 2,
  remateOffsetWarnMm: 2,
} as const;
