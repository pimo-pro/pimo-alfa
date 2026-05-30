import type { ProjectRoomConfig, RoomWallLabel } from "../../3d/viewer-engine/room/roomEngineTypes";
import { pickPrimaryWallRun } from "./autoFillSettings";
import type { LayoutDetectionResult } from "./autoRoomFillTypes";
import { analyzeRoomWalls, detectRoomCorners } from "./roomAnalysis";
import type { AnalyzedWallRun } from "./autoRoomFillTypes";

export const MIN_ISLAND_CENTER_W_MM = 1600;
export const MIN_ISLAND_CENTER_D_MM = 1200;
export const MIN_ISLAND_WALL_CLEARANCE_MM = 900;

const ADJACENT_PAIRS: Array<[RoomWallLabel, RoomWallLabel]> = [
  ["sul", "este"],
  ["este", "norte"],
  ["norte", "oeste"],
  ["oeste", "sul"],
];

const U_CHAINS: RoomWallLabel[][] = [
  ["sul", "este", "norte"],
  ["este", "norte", "oeste"],
  ["norte", "oeste", "sul"],
  ["oeste", "sul", "este"],
];

function usefulLengthMm(run: AnalyzedWallRun): number {
  return run.segments.reduce((sum, s) => sum + s.lengthMm, 0);
}

function hasValidCornerBetween(
  corners: ReturnType<typeof detectRoomCorners>,
  room: ProjectRoomConfig,
  a: RoomWallLabel,
  b: RoomWallLabel
): boolean {
  const idA = room.walls.find((w) => w.label === a)?.id;
  const idB = room.walls.find((w) => w.label === b)?.id;
  if (!idA || !idB) return false;
  return corners.some(
    (c) => c.valid && c.wallIds.includes(idA) && c.wallIds.includes(idB)
  );
}

function computeCenterFree(room: ProjectRoomConfig): {
  widthMm: number;
  depthMm: number;
  islandEligible: boolean;
} {
  const widthMm = Math.max(0, room.widthMm - 2 * MIN_ISLAND_WALL_CLEARANCE_MM);
  const depthMm = Math.max(0, room.depthMm - 2 * MIN_ISLAND_WALL_CLEARANCE_MM);
  return {
    widthMm,
    depthMm,
    islandEligible: widthMm >= MIN_ISLAND_CENTER_W_MM && depthMm >= MIN_ISLAND_CENTER_D_MM,
  };
}

function findLPair(
  usable: Set<RoomWallLabel>,
  corners: ReturnType<typeof detectRoomCorners>,
  room: ProjectRoomConfig
): [RoomWallLabel, RoomWallLabel] | null {
  for (const [a, b] of ADJACENT_PAIRS) {
    if (usable.has(a) && usable.has(b) && hasValidCornerBetween(corners, room, a, b)) {
      return [a, b];
    }
  }
  return null;
}

function findUChain(
  usable: Set<RoomWallLabel>,
  corners: ReturnType<typeof detectRoomCorners>,
  room: ProjectRoomConfig
): RoomWallLabel[] | null {
  for (const chain of U_CHAINS) {
    if (!chain.every((l) => usable.has(l))) continue;
    const c1 = hasValidCornerBetween(corners, room, chain[0], chain[1]);
    const c2 = hasValidCornerBetween(corners, room, chain[1], chain[2]);
    if (c1 && c2) return chain;
  }
  return null;
}

export function detectKitchenLayout(room: ProjectRoomConfig): LayoutDetectionResult | null {
  const runs = analyzeRoomWalls(room);
  if (!runs.length) return null;

  const corners = detectRoomCorners(room);
  const usableRuns = runs.filter((r) => usefulLengthMm(r) >= 600);
  const usableLabels = usableRuns.map((r) => r.label);
  const usableSet = new Set(usableLabels);
  const primary = pickPrimaryWallRun(usableRuns);
  const center = computeCenterFree(room);
  const validCornerCount = corners.filter((c) => c.valid).length;

  const uChain = findUChain(usableSet, corners, room);
  const lPair = findLPair(usableSet, corners, room);

  let detectedType: LayoutDetectionResult["detectedType"] = "I";

  if (uChain && usableLabels.length >= 3) {
    detectedType = "U";
  } else if (lPair && usableLabels.length >= 2) {
    detectedType = "L";
  } else if (center.islandEligible && usableLabels.length >= 1) {
    detectedType = "island";
  } else if (usableLabels.length <= 1) {
    detectedType = "I";
  } else if (usableLabels.length >= 2) {
    detectedType = "L";
  }

  return {
    detectedType,
    usableWallLabels: usableLabels,
    validCornerCount,
    centerFreeWidthMm: Math.round(center.widthMm),
    centerFreeDepthMm: Math.round(center.depthMm),
    islandEligible: center.islandEligible,
    lPair,
    uChain,
    primaryLabel: primary.label,
  };
}

export function resolveLayoutType(
  detection: LayoutDetectionResult,
  override: import("./autoRoomFillTypes").KitchenLayoutTypeOverride | undefined
): import("./autoRoomFillTypes").KitchenLayoutType {
  if (override && override !== "auto") return override;
  return detection.detectedType;
}

export function wallLabelsForLayout(
  layoutType: import("./autoRoomFillTypes").KitchenLayoutType,
  detection: LayoutDetectionResult
): RoomWallLabel[] {
  switch (layoutType) {
    case "U":
      return detection.uChain ?? [detection.primaryLabel];
    case "L":
      return detection.lPair ?? [detection.primaryLabel];
    case "island":
      return detection.usableWallLabels.length > 0
        ? [detection.primaryLabel]
        : [detection.primaryLabel];
    case "I":
    default:
      return [detection.primaryLabel];
  }
}
