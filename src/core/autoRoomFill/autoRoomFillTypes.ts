import type { ProjectRoomWall, RoomWallLabel } from "../../3d/viewer-engine/room/roomEngineTypes";

export type AutoFillWallSelection = Record<"sul" | "este" | "norte" | "oeste", boolean>;

export type AutoFillAllowUpperByWall = Record<"sul" | "este" | "norte" | "oeste", boolean>;

export const AUTO_FILL_WALL_LABELS: RoomWallLabel[] = ["sul", "este", "norte", "oeste"];

export const EMPTY_WALL_SELECTION: AutoFillWallSelection = {
  sul: false,
  este: false,
  norte: false,
  oeste: false,
};

export const EMPTY_ALLOW_UPPER: AutoFillAllowUpperByWall = {
  sul: false,
  este: false,
  norte: false,
  oeste: false,
};

export type AutoFillModuleRole = "lower" | "upper" | "corner" | "special" | "filler";

export type AutoFillSpecialKind = "sink" | "cooktop" | "oven" | "fridge" | "hood";

export type AutoFillPlacedModule = {
  catalogId: string;
  role: AutoFillModuleRole;
  specialKind?: AutoFillSpecialKind;
  wallId: string;
  wallLabel: string;
  posicaoX_mm: number;
  posicaoY_mm: number;
  posicaoZ_mm: number;
  rotacaoY_rad: number;
  /** Redução visual na largura do último módulo (mm). */
  trimWidthMm?: number;
  /** Largura do painel de enchimento visual (mm). */
  fillerWidthMm?: number;
};

export type AutoFillFinishSpec = {
  boxIndex: number;
  wallId: string;
  remateDir?: boolean;
  remateEsq?: boolean;
  remateL?: boolean;
  hematiDir?: boolean;
  hematiEsq?: boolean;
  hematiCima?: boolean;
  rodapeSimple?: boolean;
};

export type AutoFillWallSummary = {
  wallId: string;
  wallLabel: string;
  usefulLengthMm: number;
  wastedMm: number;
  trimAppliedMm: number;
  lowerCount: number;
  upperCount: number;
  specialCount: number;
  fillerCount: number;
  cornerCount: number;
  remateCount: number;
  hematiCount: number;
  rodapeCount: number;
  specialsPlaced: AutoFillSpecialKind[];
  moduleCount: number;
};

export type AutoFillPlan = {
  modules: AutoFillPlacedModule[];
  finishes: AutoFillFinishSpec[];
  wallSummaries: AutoFillWallSummary[];
  corners: Array<{ wallIds: [string, string]; x_mm: number; z_mm: number; valid: boolean }>;
  summaryLines: string[];
  specialsPlaced: AutoFillSpecialKind[];
};

export type ProjectAutoFillState = {
  lastRunAt: string;
  summary: string;
  detailedSummary?: string;
  wallSelection: AutoFillWallSelection;
  allowUpperModules: AutoFillAllowUpperByWall;
  layoutType?: KitchenLayoutType;
  layoutTypeOverride?: KitchenLayoutTypeOverride;
  layoutSummary?: string;
  islandConfig?: AutoFillIslandConfig | null;
  wallAssignments?: AutoFillWallAssignment[];
  createdBoxIds: string[];
  createdRemateIds: string[];
  createdHematiIds: string[];
  createdRodapeIds: string[];
  wallSummaries: AutoFillWallSummary[];
  specialsPlaced: AutoFillSpecialKind[];
  trimAppliedMm?: number;
};

export const ISLAND_LAYOUT_WALL_ID = "layout-island";

export type AutoFillGenerateOptions = {
  wallSelection: AutoFillWallSelection;
  allowUpperModules: AutoFillAllowUpperByWall;
};

/** Layout de cozinha 3.0 — I, L, U ou ilha. */
export type KitchenLayoutType = "I" | "L" | "U" | "island";

export type KitchenLayoutTypeOverride = KitchenLayoutType | "auto";

export type AutoFillWallAssignment = {
  label: RoomWallLabel;
  wallId: string;
  role: "primary" | "secondary" | "tertiary" | "leg";
  usefulLengthMm: number;
};

export type AutoFillIslandConfig = {
  widthMm: number;
  depthMm: number;
  centerX_mm: number;
  centerZ_mm: number;
  moduleCatalogIds: string[];
  hasSink: boolean;
  hasCooktop: boolean;
};

export type LayoutDetectionResult = {
  detectedType: KitchenLayoutType;
  usableWallLabels: RoomWallLabel[];
  validCornerCount: number;
  centerFreeWidthMm: number;
  centerFreeDepthMm: number;
  islandEligible: boolean;
  lPair: [RoomWallLabel, RoomWallLabel] | null;
  uChain: RoomWallLabel[] | null;
  primaryLabel: RoomWallLabel;
};

export type AutoFillApplyResult = {
  state: import("../../context/projectTypes").ProjectState;
  createdBoxIds: string[];
  createdRemateIds: string[];
  createdHematiIds: string[];
  createdRodapeIds: string[];
  summary: string;
  detailedSummary: string;
};

export type WallRunAxis = "x" | "z";

export type AnalyzedWallRun = {
  wall: ProjectRoomWall;
  wallId: string;
  label: RoomWallLabel;
  lengthMm: number;
  axis: WallRunAxis;
  fixedCoordMm: number;
  runStartMm: number;
  runEndMm: number;
  rotacaoY_rad: number;
  inwardNormal: { x: number; z: number };
  cornerAtStart: boolean;
  cornerAtEnd: boolean;
  segments: Array<{ startMm: number; endMm: number; lengthMm: number }>;
};
