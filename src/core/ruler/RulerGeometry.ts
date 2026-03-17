import * as THREE from "three";
import type { MeasurementAnchor, MeasurementType, SnapKind } from "./RulerState";

export type DistanceResult = { distanceMm: number; pointA: THREE.Vector3; pointB: THREE.Vector3 };

const toMm = (meters: number): number => Math.round(meters * 1000);
const box3From = (obj: THREE.Object3D): THREE.Box3 => new THREE.Box3().setFromObject(obj);

function axisGap(minA: number, maxA: number, minB: number, maxB: number): number {
  if (maxA < minB) return minB - maxA;
  if (maxB < minA) return minA - maxB;
  return 0;
}

function nearestPointsFromBoxes(a: THREE.Box3, b: THREE.Box3): { pointA: THREE.Vector3; pointB: THREE.Vector3 } {
  const ca = a.getCenter(new THREE.Vector3());
  const cb = b.getCenter(new THREE.Vector3());
  const pointA = new THREE.Vector3(
    THREE.MathUtils.clamp(cb.x, a.min.x, a.max.x),
    THREE.MathUtils.clamp(cb.y, a.min.y, a.max.y),
    THREE.MathUtils.clamp(cb.z, a.min.z, a.max.z)
  );
  const pointB = new THREE.Vector3(
    THREE.MathUtils.clamp(ca.x, b.min.x, b.max.x),
    THREE.MathUtils.clamp(ca.y, b.min.y, b.max.y),
    THREE.MathUtils.clamp(ca.z, b.min.z, b.max.z)
  );
  return { pointA, pointB };
}

export function distancePoint3D(p1: THREE.Vector3, p2: THREE.Vector3): number {
  return toMm(p1.distanceTo(p2));
}

export function getHorizontalDistance(p1: THREE.Vector3, p2: THREE.Vector3): number {
  return toMm(Math.hypot(p1.x - p2.x, p1.z - p2.z));
}

export function getVerticalDistance(p1: THREE.Vector3, p2: THREE.Vector3): number {
  return toMm(Math.abs(p1.y - p2.y));
}

export function distanceBoxToBox(a: THREE.Object3D, b: THREE.Object3D): DistanceResult {
  const ba = box3From(a);
  const bb = box3From(b);
  const dx = axisGap(ba.min.x, ba.max.x, bb.min.x, bb.max.x);
  const dy = axisGap(ba.min.y, ba.max.y, bb.min.y, bb.max.y);
  const dz = axisGap(ba.min.z, ba.max.z, bb.min.z, bb.max.z);
  const { pointA, pointB } = nearestPointsFromBoxes(ba, bb);
  return { distanceMm: toMm(Math.hypot(dx, dy, dz)), pointA, pointB };
}

export function distanceBoxToWall(box: THREE.Object3D, wall: THREE.Object3D): DistanceResult {
  return distanceBoxToBox(box, wall);
}

export function distanceBoxToFloor(box: THREE.Object3D): DistanceResult {
  const b = box3From(box);
  const center = b.getCenter(new THREE.Vector3());
  const pointA = new THREE.Vector3(center.x, b.min.y, center.z);
  const pointB = new THREE.Vector3(center.x, 0, center.z);
  return { distanceMm: toMm(Math.max(0, b.min.y)), pointA, pointB };
}

export function distanceSurfaceToSurface(s1: THREE.Object3D, s2: THREE.Object3D): DistanceResult {
  return distanceBoxToBox(s1, s2);
}

type SideCandidate = {
  side: "left" | "right";
  gapM: number;
  pointA: THREE.Vector3;
  pointB: THREE.Vector3;
  otherBox: THREE.Box3;
};

function overlaps(minA: number, maxA: number, minB: number, maxB: number): boolean {
  return Math.min(maxA, maxB) - Math.max(minA, minB) > 1e-6;
}

function makeSideCandidate(moving: THREE.Box3, other: THREE.Box3): SideCandidate | null {
  const overlapY = overlaps(moving.min.y, moving.max.y, other.min.y, other.max.y);
  const overlapZ = overlaps(moving.min.z, moving.max.z, other.min.z, other.max.z);
  if (!overlapY || !overlapZ) return null;

  const y = THREE.MathUtils.clamp((Math.max(moving.min.y, other.min.y) + Math.min(moving.max.y, other.max.y)) * 0.5, moving.min.y, moving.max.y);
  const z = THREE.MathUtils.clamp((Math.max(moving.min.z, other.min.z) + Math.min(moving.max.z, other.max.z)) * 0.5, moving.min.z, moving.max.z);

  if (other.max.x <= moving.min.x) {
    return {
      side: "left",
      gapM: moving.min.x - other.max.x,
      pointA: new THREE.Vector3(moving.min.x, y, z),
      pointB: new THREE.Vector3(other.max.x, y, z),
      otherBox: other,
    };
  }
  if (other.min.x >= moving.max.x) {
    return {
      side: "right",
      gapM: other.min.x - moving.max.x,
      pointA: new THREE.Vector3(moving.max.x, y, z),
      pointB: new THREE.Vector3(other.min.x, y, z),
      otherBox: other,
    };
  }
  return null;
}

export type LateralMeasurements = {
  left: DistanceResult | null;
  right: DistanceResult | null;
  centerDeltaMm: number | null;
  centerAligned: boolean;
};

export function getLateralFaceToFaceMeasurements(
  movingObject: THREE.Object3D,
  otherObjects: THREE.Object3D[]
): LateralMeasurements {
  const moving = box3From(movingObject);
  let bestLeft: SideCandidate | null = null;
  let bestRight: SideCandidate | null = null;

  otherObjects.forEach((obj) => {
    if (obj === movingObject) return;
    const other = box3From(obj);
    const candidate = makeSideCandidate(moving, other);
    if (!candidate) return;
    if (candidate.side === "left" && (!bestLeft || candidate.gapM < bestLeft.gapM)) bestLeft = candidate;
    if (candidate.side === "right" && (!bestRight || candidate.gapM < bestRight.gapM)) bestRight = candidate;
  });

  const left =
    bestLeft == null
      ? null
      : { distanceMm: toMm(bestLeft.gapM), pointA: bestLeft.pointA.clone(), pointB: bestLeft.pointB.clone() };
  const right =
    bestRight == null
      ? null
      : { distanceMm: toMm(bestRight.gapM), pointA: bestRight.pointA.clone(), pointB: bestRight.pointB.clone() };

  if (!bestLeft || !bestRight) {
    return { left, right, centerDeltaMm: null, centerAligned: false };
  }

  const leftFace = bestLeft.otherBox.max.x;
  const rightFace = bestRight.otherBox.min.x;
  const targetCenterX = (leftFace + rightFace) * 0.5;
  const movingCenterX = (moving.min.x + moving.max.x) * 0.5;
  const centerDeltaMm = toMm(targetCenterX - movingCenterX);
  const diff = Math.abs((left?.distanceMm ?? 0) - (right?.distanceMm ?? 0));
  return {
    left,
    right,
    centerDeltaMm,
    centerAligned: diff < 5,
  };
}

function deriveType(a: THREE.Vector3, b: THREE.Vector3): MeasurementType {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  const dz = Math.abs(a.z - b.z);
  if (dy >= dx && dy >= dz) return "vertical";
  if (dy < 1e-6) return "horizontal";
  return "diagonal";
}

function objectKey(obj: THREE.Object3D | null): string | null {
  if (!obj) return null;
  if (typeof obj.userData?.boxId === "string") return `box:${obj.userData.boxId}`;
  if (typeof obj.userData?.wallId === "string") return `wall:${obj.userData.wallId}`;
  return obj.uuid;
}

export type SnapResult = { point: THREE.Vector3; anchor: MeasurementAnchor; type: MeasurementType };

export function snapToNearest(point: THREE.Vector3, scene: THREE.Scene): SnapResult {
  const candidates: Array<{ point: THREE.Vector3; obj: THREE.Object3D | null; kind: SnapKind }> = [
    { point: point.clone(), obj: null, kind: "point" },
  ];
  scene.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    if (obj.visible === false) return;
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3());
    candidates.push({ point: c, obj, kind: typeof obj.userData?.wallId !== "undefined" ? "wall-center" : "box-center" });
    const min = box.min;
    const max = box.max;
    const corners = [
      new THREE.Vector3(min.x, min.y, min.z), new THREE.Vector3(max.x, min.y, min.z),
      new THREE.Vector3(min.x, max.y, min.z), new THREE.Vector3(max.x, max.y, min.z),
      new THREE.Vector3(min.x, min.y, max.z), new THREE.Vector3(max.x, min.y, max.z),
      new THREE.Vector3(min.x, max.y, max.z), new THREE.Vector3(max.x, max.y, max.z),
    ];
    corners.forEach((p) => candidates.push({ point: p, obj, kind: "box-corner" }));
    const edgeMid = new THREE.Vector3((min.x + max.x) * 0.5, min.y, min.z);
    candidates.push({ point: edgeMid, obj, kind: "box-edge" });
    const surface = point.clone().clamp(min, max);
    candidates.push({ point: surface, obj, kind: "surface" });
  });
  let best = candidates[0];
  let bestDist = best.point.distanceToSquared(point);
  for (let i = 1; i < candidates.length; i += 1) {
    const d = candidates[i].point.distanceToSquared(point);
    if (d < bestDist) {
      best = candidates[i];
      bestDist = d;
    }
  }
  const type = deriveType(point, best.point);
  const anchor: MeasurementAnchor = {
    objectId: objectKey(best.obj),
    localPoint: best.obj ? best.obj.worldToLocal(best.point.clone()) : best.point.clone(),
    worldPoint: best.point.clone(),
    kind: best.kind,
  };
  return { point: best.point.clone(), anchor, type };
}

