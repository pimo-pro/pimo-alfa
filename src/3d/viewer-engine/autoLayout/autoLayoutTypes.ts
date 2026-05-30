import type { WorkspaceBox } from "../../../core/types";

export type AutoLayoutOpeningMm = {
  minX_mm: number;
  maxX_mm: number;
  minZ_mm: number;
  maxZ_mm: number;
};

export type AutoLayoutRoomBoundsMm = {
  minX_mm: number;
  maxX_mm: number;
  minZ_mm: number;
  maxZ_mm: number;
  minY_mm: number;
  maxY_mm: number;
};

export type WallLayoutDef = {
  wallId: number;
  axis: "x" | "z";
  rangeStart_mm: number;
  rangeEnd_mm: number;
  fixedCenter_mm: number;
  fixedAxis: "x" | "z";
};

export type AutoLayoutPlacement = {
  x_mm: number;
  y_mm: number;
  z_mm: number;
};

export type AutoLayoutPlan = {
  cloneBoxes: Array<{ sourceId: string; placement: AutoLayoutPlacement }>;
  moveBoxes: Array<{ boxId: string; placement: AutoLayoutPlacement }>;
  shelfUpdates: Array<{ boxId: string; count: number }>;
};

export type AutoStackShelvesOptions = {
  count: number;
  topMarginMm: number;
  bottomMarginMm: number;
};

export type AutoLayoutBridge = {
  getWorkspaceBoxes: () => WorkspaceBox[];
  getRoomBoundsMm: () => AutoLayoutRoomBoundsMm | null;
  getOpeningsMm: () => AutoLayoutOpeningMm[];
  getWallOffsetMm: () => number;
  applyPlan: (_plan: AutoLayoutPlan) => void;
};

export const ROOM_LAYOUT_INSET_MM = 0;
