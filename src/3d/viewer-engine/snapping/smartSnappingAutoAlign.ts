import * as THREE from "three";
import type { ViewerBoxEntry } from "../types";
import type { BoxAabb, SnapCandidate } from "./smartSnappingTypes";
import { boxesOverlapOnAxis, pushCandidate } from "./smartSnappingTypes";

/** Auto-alignment ortogonal entre caixas (flush, stack, depth, height). */
export function collectAutoAlignmentCandidates(
  moving: BoxAabb,
  boxes: Map<string, ViewerBoxEntry>,
  selectedBoxId: string,
  captureM: number,
  getAabb: (mesh: THREE.Object3D) => BoxAabb,
  out: SnapCandidate[]
): void {
  boxes.forEach((entry, boxId) => {
    if (boxId === selectedBoxId) return;
    const other = getAabb(entry.mesh);
    collectFlushCandidates(moving, other, captureM, out);
    collectStackCandidates(moving, other, captureM, out);
    collectDepthCandidates(moving, other, captureM, out);
    collectHeightCandidates(moving, other, captureM, out);
  });
}

function collectFlushCandidates(moving: BoxAabb, other: BoxAabb, captureM: number, out: SnapCandidate[]): void {
  const pairs: Array<{ movingVal: number; otherVal: number; axis: "x" | "y" | "z" }> = [
    { movingVal: moving.max.x, otherVal: other.min.x, axis: "x" },
    { movingVal: moving.min.x, otherVal: other.max.x, axis: "x" },
    { movingVal: moving.max.z, otherVal: other.min.z, axis: "z" },
    { movingVal: moving.min.z, otherVal: other.max.z, axis: "z" },
  ];

  for (const pair of pairs) {
    const gap = pair.otherVal - pair.movingVal;
    const distanceM = Math.abs(gap);
    if (distanceM > captureM) continue;
    const perpAxis = pair.axis === "x" ? "z" : "x";
    if (!boxesOverlapOnAxis(moving, other, perpAxis)) continue;
    const delta = new THREE.Vector3();
    delta[pair.axis] = gap;
    const snapPoint = moving.center.clone();
    snapPoint[pair.axis] = pair.otherVal;
    pushCandidate(out, {
      kind: "autoFlush",
      delta,
      snapPoint,
      distanceM,
      alignmentType: "flush",
      distanceLabelMm: distanceM * 1000,
      guides: [{ start: moving.center.clone(), end: snapPoint.clone() }],
    });
  }
}

function collectStackCandidates(moving: BoxAabb, other: BoxAabb, captureM: number, out: SnapCandidate[]): void {
  if (!boxesOverlapOnAxis(moving, other, "x") || !boxesOverlapOnAxis(moving, other, "z")) return;
  const gap = other.max.y - moving.min.y;
  const distanceM = Math.abs(gap);
  if (distanceM > captureM) return;
  const delta = new THREE.Vector3(0, gap, 0);
  const snapPoint = new THREE.Vector3(moving.center.x, moving.center.y + gap, moving.center.z);
  pushCandidate(out, {
    kind: "autoStack",
    delta,
    snapPoint,
    distanceM,
    alignmentType: "stack",
    distanceLabelMm: distanceM * 1000,
    guides: [
      {
        start: new THREE.Vector3(moving.center.x, moving.min.y, moving.center.z),
        end: new THREE.Vector3(moving.center.x, other.max.y, moving.center.z),
      },
    ],
  });
}

function collectDepthCandidates(moving: BoxAabb, other: BoxAabb, captureM: number, out: SnapCandidate[]): void {
  if (!boxesOverlapOnAxis(moving, other, "x")) return;
  const targets = [
    { val: other.min.z, movingVal: moving.min.z },
    { val: other.max.z, movingVal: moving.max.z },
    { val: other.center.z, movingVal: moving.center.z },
  ];
  for (const t of targets) {
    const deltaVal = t.val - t.movingVal;
    const distanceM = Math.abs(deltaVal);
    if (distanceM > captureM) continue;
    const delta = new THREE.Vector3(0, 0, deltaVal);
    const snapPoint = moving.center.clone();
    snapPoint.z = moving.center.z + deltaVal;
    pushCandidate(out, {
      kind: "autoDepth",
      delta,
      snapPoint,
      distanceM,
      alignmentType: "depth",
      distanceLabelMm: distanceM * 1000,
    });
  }
}

function collectHeightCandidates(moving: BoxAabb, other: BoxAabb, captureM: number, out: SnapCandidate[]): void {
  if (!boxesOverlapOnAxis(moving, other, "x") || !boxesOverlapOnAxis(moving, other, "z")) return;
  const targets = [
    { val: other.max.y, movingVal: moving.max.y },
    { val: other.min.y, movingVal: moving.min.y },
    { val: other.center.y, movingVal: moving.center.y },
  ];
  for (const t of targets) {
    const deltaVal = t.val - t.movingVal;
    const distanceM = Math.abs(deltaVal);
    if (distanceM > captureM) continue;
    const delta = new THREE.Vector3(0, deltaVal, 0);
    const snapPoint = moving.center.clone();
    snapPoint.y = moving.center.y + deltaVal;
    pushCandidate(out, {
      kind: "autoHeight",
      delta,
      snapPoint,
      distanceM,
      alignmentType: "height",
      distanceLabelMm: distanceM * 1000,
    });
  }
}
