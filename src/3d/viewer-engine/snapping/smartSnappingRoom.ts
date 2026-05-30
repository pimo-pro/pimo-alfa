import * as THREE from "three";
import { mmToM } from "../../../utils/units";
import type { BoxAabb, RoomBoundsLike, RoomOpeningLike, SnapCandidate } from "./smartSnappingTypes";
import { pushCandidate } from "./smartSnappingTypes";

const ROOM_INSET_M = 0;
const MM = (mm: number) => mmToM(mm);

export type RoomSnapOptions = {
  wallOffsetMm: number;
};

export function collectRoomCandidates(
  moving: BoxAabb,
  roomBounds: RoomBoundsLike,
  captureM: number,
  out: SnapCandidate[],
  options: RoomSnapOptions = { wallOffsetMm: 0 }
): void {
  const wallOffsetM = MM(Math.max(0, options.wallOffsetMm));
  const minX = roomBounds.minX + ROOM_INSET_M + wallOffsetM;
  const maxX = roomBounds.maxX - ROOM_INSET_M - wallOffsetM;
  const minZ = roomBounds.minZ + ROOM_INSET_M + wallOffsetM;
  const maxZ = roomBounds.maxZ - ROOM_INSET_M - wallOffsetM;
  const floorY = roomBounds.minY;
  const ceilingY = roomBounds.maxY;
  const { centerX, centerZ } = roomBounds;

  const corners = [
    new THREE.Vector3(minX, floorY, minZ),
    new THREE.Vector3(maxX, floorY, minZ),
    new THREE.Vector3(minX, floorY, maxZ),
    new THREE.Vector3(maxX, floorY, maxZ),
  ];

  for (const mc of bottomCornersOf(moving)) {
    for (const corner of corners) {
      const delta = corner.clone().sub(mc);
      const distanceM = Math.hypot(delta.x, delta.z);
      if (distanceM > captureM) continue;
      pushCandidate(out, {
        kind: "roomCorner",
        delta,
        snapPoint: corner.clone(),
        distanceM,
        alignmentType: "corner",
        guides: [{ start: mc.clone(), end: corner.clone() }],
      });
    }
  }

  const wallPlanes: Array<{ value: number; axis: "x" | "z"; movingVal: (b: BoxAabb) => number }> = [
    { value: minX, axis: "x", movingVal: (b) => b.min.x },
    { value: maxX, axis: "x", movingVal: (b) => b.max.x },
    { value: minZ, axis: "z", movingVal: (b) => b.min.z },
    { value: maxZ, axis: "z", movingVal: (b) => b.max.z },
  ];

  for (const wall of wallPlanes) {
    const current = wall.movingVal(moving);
    const deltaVal = wall.value - current;
    const distanceM = Math.abs(deltaVal);
    if (distanceM > captureM) continue;
    const delta = new THREE.Vector3();
    delta[wall.axis] = deltaVal;
    const snapPoint = moving.center.clone();
    snapPoint[wall.axis] = wall.value;
    pushCandidate(out, {
      kind: "roomWall",
      delta,
      snapPoint,
      distanceM,
      alignmentType: "flush",
    });
  }

  const wallMids: Array<{ axis: "x" | "z"; fixedAxis: "x" | "z"; fixedVal: number; midVal: number }> = [
    { axis: "x", fixedAxis: "z", fixedVal: minZ, midVal: centerX },
    { axis: "x", fixedAxis: "z", fixedVal: maxZ, midVal: centerX },
    { axis: "z", fixedAxis: "x", fixedVal: minX, midVal: centerZ },
    { axis: "z", fixedAxis: "x", fixedVal: maxX, midVal: centerZ },
  ];

  for (const mid of wallMids) {
    const movingOnAxis = moving.center[mid.axis];
    const deltaVal = mid.midVal - movingOnAxis;
    const distanceM = Math.abs(deltaVal);
    if (distanceM > captureM) continue;
    const fixedDist = Math.abs(moving.center[mid.fixedAxis] - mid.fixedVal);
    if (fixedDist > captureM * 2.5) continue;
    const delta = new THREE.Vector3();
    delta[mid.axis] = deltaVal;
    const snapPoint = moving.center.clone();
    snapPoint[mid.axis] = mid.midVal;
    snapPoint[mid.fixedAxis] = mid.fixedVal;
    pushCandidate(out, {
      kind: "roomWallMid",
      delta,
      snapPoint,
      distanceM,
      alignmentType: "center",
      guides: [{ start: moving.center.clone(), end: snapPoint.clone() }],
    });
  }

  const floorDelta = floorY - moving.min.y;
  if (Math.abs(floorDelta) <= captureM) {
    pushCandidate(out, {
      kind: "roomFloor",
      delta: new THREE.Vector3(0, floorDelta, 0),
      snapPoint: new THREE.Vector3(moving.center.x, moving.center.y + floorDelta, moving.center.z),
      distanceM: Math.abs(floorDelta),
      alignmentType: "flush",
    });
  }

  const ceilingDelta = ceilingY - moving.max.y;
  if (Math.abs(ceilingDelta) <= captureM) {
    pushCandidate(out, {
      kind: "roomCeiling",
      delta: new THREE.Vector3(0, ceilingDelta, 0),
      snapPoint: new THREE.Vector3(moving.center.x, moving.center.y + ceilingDelta, moving.center.z),
      distanceM: Math.abs(ceilingDelta),
      alignmentType: "height",
    });
  }
}

export function collectOpeningCandidates(
  moving: BoxAabb,
  openings: RoomOpeningLike[],
  captureM: number,
  out: SnapCandidate[]
): void {
  for (const opening of openings) {
    const edges: Array<{ axis: "x" | "y" | "z"; value: number; movingVal: (b: BoxAabb) => number }> = [
      { axis: "x", value: opening.min.x, movingVal: (b) => b.min.x },
      { axis: "x", value: opening.max.x, movingVal: (b) => b.max.x },
      { axis: "y", value: opening.min.y, movingVal: (b) => b.min.y },
      { axis: "y", value: opening.max.y, movingVal: (b) => b.max.y },
      { axis: "z", value: opening.min.z, movingVal: (b) => b.min.z },
      { axis: "z", value: opening.max.z, movingVal: (b) => b.max.z },
    ];

    for (const edge of edges) {
      const current = edge.movingVal(moving);
      const deltaVal = edge.value - current;
      const distanceM = Math.abs(deltaVal);
      if (distanceM > captureM) continue;
      const delta = new THREE.Vector3();
      delta[edge.axis] = deltaVal;
      const snapPoint = moving.center.clone();
      snapPoint[edge.axis] = edge.value;
      pushCandidate(out, {
        kind: "roomOpeningEdge",
        delta,
        snapPoint,
        distanceM,
        alignmentType: "flush",
        guides: [{ start: moving.center.clone(), end: snapPoint.clone() }],
      });
    }
  }
}

function bottomCornersOf(aabb: BoxAabb): THREE.Vector3[] {
  const { min, max } = aabb;
  const y = min.y;
  return [
    new THREE.Vector3(min.x, y, min.z),
    new THREE.Vector3(max.x, y, min.z),
    new THREE.Vector3(min.x, y, max.z),
    new THREE.Vector3(max.x, y, max.z),
  ];
}
