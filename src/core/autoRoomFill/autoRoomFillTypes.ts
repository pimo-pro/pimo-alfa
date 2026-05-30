import type { ProjectRoomWall } from "../../3d/viewer-engine/room/roomEngineTypes";

export type AutoFillModuleRole = "lower" | "upper" | "corner" | "special";

export type AutoFillSpecialKind = "sink" | "cooktop" | "oven" | "fridge" | "hood";

export type AutoFillPlacedModule = {
  catalogId: string;
  role: AutoFillModuleRole;
  specialKind?: AutoFillSpecialKind;
  wallId: string;
  posicaoX_mm: number;
  posicaoY_mm: number;
  posicaoZ_mm: number;
  rotacaoY_rad: number;
  /** Ajuste visual no último módulo da corrida (mm). */
  trimWidthMm?: number;
};

export type AutoFillFinishSpec = {
  boxIndex: number;
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
  moduleCount: number;
};

export type AutoFillPlan = {
  modules: AutoFillPlacedModule[];
  finishes: AutoFillFinishSpec[];
  wallSummaries: AutoFillWallSummary[];
  corners: Array<{ wallIds: [string, string]; x_mm: number; z_mm: number }>;
  summaryLines: string[];
};

export type ProjectAutoFillState = {
  lastRunAt: string;
  summary: string;
  createdBoxIds: string[];
  createdRemateIds: string[];
  createdHematiIds: string[];
  createdRodapeIds: string[];
  wallSummaries: AutoFillWallSummary[];
};

export type AutoFillApplyResult = {
  state: import("../../context/projectTypes").ProjectState;
  createdBoxIds: string[];
  createdRemateIds: string[];
  createdHematiIds: string[];
  createdRodapeIds: string[];
  summary: string;
};

export type WallRunAxis = "x" | "z";

export type AnalyzedWallRun = {
  wall: ProjectRoomWall;
  wallId: string;
  label: string;
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
