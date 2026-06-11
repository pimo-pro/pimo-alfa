import * as THREE from "three";
import { mmToM } from "../../../utils/units";
import { SNAP_THRESHOLD } from "../../snapping/ModelWallSnap";
import type { BoxAabb, RoomBoundsLike, RoomOpeningLike } from "./smartSnappingTypes";
import { collectOpeningCandidates, collectRoomCandidates } from "./smartSnappingRoom";
import type { SmartAlignSnapContext, UnifiedSnapCandidate } from "./smartAlignSnapTypes";
import type { SnapCandidate } from "./smartSnappingTypes";

/** Porta > Janela > Canto > Centro de parede > AABB (flush parede). */
export function roomSnapPriorityScore(kind: string): number {
  if (kind === "room_door") return 0;
  if (kind === "room_window") return 1;
  if (kind === "room_corner") return 2;
  if (kind === "room_wall_mid") return 3;
  if (kind === "room_wall" || kind === "roomFloor") return 4;
  return 5;
}

export type RoomSnapReadContext = {
  roomBounds: RoomBoundsLike;
  openings: RoomOpeningLike[];
  wallOffsetMm: number;
  captureRadiusM: number;
};

/** Offset automático ao lado de aberturas (porta/janela). */
export const OPENING_SIDE_OFFSET_M = mmToM(50);

const _legacyOut: SnapCandidate[] = [];

function toUnified(
  legacy: SnapCandidate,
  targetId: string,
  openingType?: "door" | "window"
): UnifiedSnapCandidate {
  let kind: string = legacy.kind;
  if (legacy.kind === "roomOpeningEdge" && openingType === "door") kind = "room_door";
  else if (legacy.kind === "roomOpeningEdge" && openingType === "window") kind = "room_window";
  else if (legacy.kind === "roomCorner") kind = "room_corner";
  else if (legacy.kind === "roomWallMid") kind = "room_wall_mid";
  else if (legacy.kind === "roomWall") kind = "room_wall";

  return {
    delta: legacy.delta.clone(),
    distanceM: legacy.distanceM,
    priority: roomSnapPriorityScore(kind),
    kind,
    targetId,
    targetKind: "room",
  };
}

/** Detecta candidatos de sala (paredes, cantos, aberturas) como entidades unificadas. */
export function collectUnifiedRoomSnapCandidates(
  moving: BoxAabb,
  ctx: SmartAlignSnapContext
): UnifiedSnapCandidate[] {
  const room = ctx.roomBoundsFull;
  if (!room) return [];

  const read: RoomSnapReadContext = {
    roomBounds: room,
    openings: ctx.roomOpenings ?? [],
    wallOffsetMm: ctx.wallOffsetMm ?? 0,
    captureRadiusM: ctx.captureRadiusM ?? SNAP_THRESHOLD,
  };

  return collectRoomSnapCandidates(moving, read);
}

export function collectRoomSnapCandidates(
  moving: BoxAabb,
  read: RoomSnapReadContext
): UnifiedSnapCandidate[] {
  const captureM = read.captureRadiusM;
  _legacyOut.length = 0;

  collectRoomCandidates(moving, read.roomBounds, captureM, _legacyOut, {
    wallOffsetMm: read.wallOffsetMm,
  });

  const unified: UnifiedSnapCandidate[] = [];
  for (const c of _legacyOut) {
    const targetId =
      c.kind === "roomCorner"
        ? `corner-${c.snapPoint.x.toFixed(3)}-${c.snapPoint.z.toFixed(3)}`
        : c.kind === "roomWallMid"
          ? `wall-mid-${c.snapPoint.x.toFixed(3)}-${c.snapPoint.z.toFixed(3)}`
          : `wall-${c.snapPoint.x.toFixed(3)}-${c.snapPoint.z.toFixed(3)}`;
    unified.push(toUnified(c, targetId));
  }

  for (const opening of read.openings) {
    _legacyOut.length = 0;
    collectOpeningCandidates(moving, [opening], captureM, _legacyOut);
    for (const c of _legacyOut) {
      unified.push(toUnified(c, opening.elementId, opening.type));
    }
    for (const side of collectOpeningSideOffsets(moving, opening, captureM)) {
      unified.push(side);
    }
  }

  return unified;
}

function collectOpeningSideOffsets(
  moving: BoxAabb,
  opening: RoomOpeningLike,
  captureM: number
): UnifiedSnapCandidate[] {
  const out: UnifiedSnapCandidate[] = [];
  const center = new THREE.Vector3(
    (opening.min.x + opening.max.x) * 0.5,
    moving.center.y,
    (opening.min.z + opening.max.z) * 0.5
  );

  const sides: Array<{ axis: "x" | "z"; sign: number }> = [
    { axis: "x", sign: -1 },
    { axis: "x", sign: 1 },
    { axis: "z", sign: -1 },
    { axis: "z", sign: 1 },
  ];

  for (const side of sides) {
    const target = center.clone();
    const half =
      side.axis === "x"
        ? (opening.max.x - opening.min.x) * 0.5
        : (opening.max.z - opening.min.z) * 0.5;
    target[side.axis] += side.sign * (half + OPENING_SIDE_OFFSET_M);
    const movingEdge =
      side.axis === "x"
        ? side.sign < 0
          ? moving.min.x
          : moving.max.x
        : side.sign < 0
          ? moving.min.z
          : moving.max.z;
    const deltaVal = target[side.axis] - movingEdge;
    const distanceM = Math.abs(deltaVal);
    if (distanceM > captureM) continue;
    const delta = new THREE.Vector3();
    delta[side.axis] = deltaVal;
    const kind = opening.type === "door" ? "room_door" : "room_window";
    out.push({
      delta,
      distanceM,
      priority: roomSnapPriorityScore(kind),
      kind: `${kind}_side`,
      targetId: `${opening.elementId}-side`,
      targetKind: "room",
    });
  }

  return out;
}

/** Somente leitura — threshold do ModelWallSnap para consistência. */
export function modelWallSnapThresholdM(): number {
  return SNAP_THRESHOLD;
}
