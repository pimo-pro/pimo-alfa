import * as THREE from "three";
import type { BoxAabb, SnapCandidate } from "./smartSnappingTypes";
import { pushCandidate } from "./smartSnappingTypes";

export function collectBasicBoxCandidates(
  moving: BoxAabb,
  other: BoxAabb,
  captureM: number,
  out: SnapCandidate[]
): void {
  collectVertexCandidates(moving, other, captureM, out);
  collectEdgeAlignCandidates(moving, other, captureM, out);
  collectFaceCandidates(moving, other, captureM, out);
}

export function collectAdvancedBoxCandidates(
  moving: BoxAabb,
  other: BoxAabb,
  captureM: number,
  out: SnapCandidate[]
): void {
  collectVertexCandidates(moving, other, captureM, out);
  collectEdgeMidCandidates(moving, other, captureM, out);
  collectEdgeAlignCandidates(moving, other, captureM, out);
  collectFaceCenterCandidates(moving, other, captureM, out);
  collectBoxAxisCandidates(moving, other, captureM, out);
  collectBoxCenterCandidates(moving, other, captureM, out);
  collectBboxProjectionCandidates(moving, other, captureM, out);
  collectFaceCandidates(moving, other, captureM, out);
}

function collectVertexCandidates(moving: BoxAabb, other: BoxAabb, captureM: number, out: SnapCandidate[]): void {
  for (const mc of cornersOf(moving)) {
    for (const oc of cornersOf(other)) {
      const delta = oc.clone().sub(mc);
      const distanceM = delta.length();
      if (distanceM > captureM) continue;
      pushCandidate(out, { kind: "vertex", delta, snapPoint: oc.clone(), distanceM });
    }
  }
}

function collectEdgeMidCandidates(moving: BoxAabb, other: BoxAabb, captureM: number, out: SnapCandidate[]): void {
  const movingMids = edgeMidpointsOf(moving);
  const otherMids = edgeMidpointsOf(other);
  for (const mm of movingMids) {
    for (const om of otherMids) {
      const delta = om.clone().sub(mm);
      const distanceM = delta.length();
      if (distanceM > captureM) continue;
      pushCandidate(out, {
        kind: "edgeMid",
        delta,
        snapPoint: om.clone(),
        distanceM,
        guides: [{ start: mm.clone(), end: om.clone() }],
      });
    }
  }
}

function collectEdgeAlignCandidates(moving: BoxAabb, other: BoxAabb, captureM: number, out: SnapCandidate[]): void {
  const pairs: Array<[number, number, "x" | "y" | "z"]> = [
    [moving.min.x, other.min.x, "x"],
    [moving.min.x, other.max.x, "x"],
    [moving.max.x, other.min.x, "x"],
    [moving.max.x, other.max.x, "x"],
    [moving.min.y, other.min.y, "y"],
    [moving.min.y, other.max.y, "y"],
    [moving.max.y, other.min.y, "y"],
    [moving.max.y, other.max.y, "y"],
    [moving.min.z, other.min.z, "z"],
    [moving.min.z, other.max.z, "z"],
    [moving.max.z, other.min.z, "z"],
    [moving.max.z, other.max.z, "z"],
  ];
  for (const [a, b, axis] of pairs) {
    const deltaVal = b - a;
    const distanceM = Math.abs(deltaVal);
    if (distanceM > captureM) continue;
    const delta = new THREE.Vector3();
    delta[axis] = deltaVal;
    const snapPoint = moving.center.clone();
    snapPoint[axis] = b;
    pushCandidate(out, {
      kind: "edge",
      delta,
      snapPoint,
      distanceM,
      guides: [{ start: new THREE.Vector3(moving.center.x, moving.center.y, moving.center.z), end: snapPoint.clone() }],
    });
  }
}

function collectFaceCenterCandidates(moving: BoxAabb, other: BoxAabb, captureM: number, out: SnapCandidate[]): void {
  for (const mc of faceCentersOf(moving)) {
    for (const oc of faceCentersOf(other)) {
      const delta = oc.clone().sub(mc);
      const distanceM = delta.length();
      if (distanceM > captureM) continue;
      pushCandidate(out, {
        kind: "faceCenter",
        delta,
        snapPoint: oc.clone(),
        distanceM,
        guides: [{ start: mc.clone(), end: oc.clone() }],
      });
    }
  }
}

function collectBoxAxisCandidates(moving: BoxAabb, other: BoxAabb, captureM: number, out: SnapCandidate[]): void {
  const axes: Array<"x" | "y" | "z"> = ["x", "y", "z"];
  for (const axis of axes) {
    const otherLine = other.center[axis];
    const movingVal = moving.center[axis];
    const deltaVal = otherLine - movingVal;
    const distanceM = Math.abs(deltaVal);
    if (distanceM > captureM) continue;
    const delta = new THREE.Vector3();
    delta[axis] = deltaVal;
    const snapPoint = moving.center.clone();
    snapPoint[axis] = otherLine;
    const guideStart = moving.center.clone();
    const guideEnd = snapPoint.clone();
    pushCandidate(out, {
      kind: "boxAxis",
      delta,
      snapPoint,
      distanceM,
      guides: [{ start: guideStart, end: guideEnd }],
    });
  }
}

function collectBoxCenterCandidates(moving: BoxAabb, other: BoxAabb, captureM: number, out: SnapCandidate[]): void {
  const delta = other.center.clone().sub(moving.center);
  const distanceM = delta.length();
  if (distanceM > captureM) return;
  pushCandidate(out, {
    kind: "boxCenter",
    delta,
    snapPoint: other.center.clone(),
    distanceM,
    guides: [{ start: moving.center.clone(), end: other.center.clone() }],
  });
}

function collectBboxProjectionCandidates(moving: BoxAabb, other: BoxAabb, captureM: number, out: SnapCandidate[]): void {
  const axes: Array<"x" | "y" | "z"> = ["x", "y", "z"];
  for (const axis of axes) {
    const min = other.min[axis];
    const max = other.max[axis];
    const targets = [min, max, (min + max) * 0.5];
    for (const target of targets) {
      const movingVal = moving.center[axis];
      const deltaVal = target - movingVal;
      const distanceM = Math.abs(deltaVal);
      if (distanceM > captureM) continue;
      const perpDist = perpendicularDistanceToSlab(moving.center, other, axis);
      if (perpDist > captureM * 2) continue;
      const delta = new THREE.Vector3();
      delta[axis] = deltaVal;
      const snapPoint = moving.center.clone();
      snapPoint[axis] = target;
      pushCandidate(out, {
        kind: "bboxProjection",
        delta,
        snapPoint,
        distanceM,
        guides: [{ start: moving.center.clone(), end: snapPoint.clone() }],
      });
    }
  }
}

function collectFaceCandidates(moving: BoxAabb, other: BoxAabb, captureM: number, out: SnapCandidate[]): void {
  const facePairs: Array<{ movingVal: number; otherVal: number; axis: "x" | "y" | "z" }> = [
    { movingVal: moving.max.x, otherVal: other.min.x, axis: "x" },
    { movingVal: moving.min.x, otherVal: other.max.x, axis: "x" },
    { movingVal: moving.max.y, otherVal: other.min.y, axis: "y" },
    { movingVal: moving.min.y, otherVal: other.max.y, axis: "y" },
    { movingVal: moving.max.z, otherVal: other.min.z, axis: "z" },
    { movingVal: moving.min.z, otherVal: other.max.z, axis: "z" },
  ];
  for (const face of facePairs) {
    const gap = face.otherVal - face.movingVal;
    const distanceM = Math.abs(gap);
    if (distanceM > captureM) continue;
    const delta = new THREE.Vector3();
    delta[face.axis] = gap;
    const snapPoint = moving.center.clone();
    snapPoint[face.axis] = face.otherVal;
    pushCandidate(out, { kind: "face", delta, snapPoint, distanceM });
  }
}

function perpendicularDistanceToSlab(point: THREE.Vector3, box: BoxAabb, ignoreAxis: "x" | "y" | "z"): number {
  const axes: Array<"x" | "y" | "z"> = ["x", "y", "z"].filter((a) => a !== ignoreAxis) as Array<"x" | "y" | "z">;
  let d = 0;
  for (const axis of axes) {
    if (point[axis] < box.min[axis]) d = Math.max(d, box.min[axis] - point[axis]);
    else if (point[axis] > box.max[axis]) d = Math.max(d, point[axis] - box.max[axis]);
  }
  return d;
}

function cornersOf(aabb: BoxAabb): THREE.Vector3[] {
  const { min, max } = aabb;
  return [
    new THREE.Vector3(min.x, min.y, min.z),
    new THREE.Vector3(max.x, min.y, min.z),
    new THREE.Vector3(min.x, max.y, min.z),
    new THREE.Vector3(max.x, max.y, min.z),
    new THREE.Vector3(min.x, min.y, max.z),
    new THREE.Vector3(max.x, min.y, max.z),
    new THREE.Vector3(min.x, max.y, max.z),
    new THREE.Vector3(max.x, max.y, max.z),
  ];
}

function edgeMidpointsOf(aabb: BoxAabb): THREE.Vector3[] {
  const { min, max } = aabb;
  const cx = (min.x + max.x) * 0.5;
  const cy = (min.y + max.y) * 0.5;
  const cz = (min.z + max.z) * 0.5;
  return [
    new THREE.Vector3(cx, min.y, min.z),
    new THREE.Vector3(cx, max.y, min.z),
    new THREE.Vector3(cx, min.y, max.z),
    new THREE.Vector3(cx, max.y, max.z),
    new THREE.Vector3(min.x, cy, min.z),
    new THREE.Vector3(max.x, cy, min.z),
    new THREE.Vector3(min.x, cy, max.z),
    new THREE.Vector3(max.x, cy, max.z),
    new THREE.Vector3(min.x, min.y, cz),
    new THREE.Vector3(max.x, min.y, cz),
    new THREE.Vector3(min.x, max.y, cz),
    new THREE.Vector3(max.x, max.y, cz),
  ];
}

function faceCentersOf(aabb: BoxAabb): THREE.Vector3[] {
  const { min, max, center } = aabb;
  return [
    new THREE.Vector3(min.x, center.y, center.z),
    new THREE.Vector3(max.x, center.y, center.z),
    new THREE.Vector3(center.x, min.y, center.z),
    new THREE.Vector3(center.x, max.y, center.z),
    new THREE.Vector3(center.x, center.y, min.z),
    new THREE.Vector3(center.x, center.y, max.z),
  ];
}
