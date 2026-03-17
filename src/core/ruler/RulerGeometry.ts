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
  if (typeof obj.userData?.wallId === "string" || typeof obj.userData?.wallId === "number") return `wall:${String(obj.userData.wallId)}`;
  return obj.uuid;
}

export type SnapVisual = {
  kind: "point" | "edge" | "face";
  color: string;
  points: THREE.Vector3[];
};

export type SnapPresetName = "fino" | "normal" | "agressivo";

export type SnapThresholds = {
  vertexMm: number;
  edgeMm: number;
  centerMm: number;
  holeMm: number;
  faceCenterMm: number;
  faceMm: number;
  planeMm: number;
};

export const SNAP_PRESETS: Record<SnapPresetName, SnapThresholds> = {
  fino: {
    vertexMm: 6,
    edgeMm: 8,
    centerMm: 10,
    holeMm: 7,
    faceCenterMm: 10,
    faceMm: 14,
    planeMm: 18,
  },
  normal: {
    vertexMm: 9,
    edgeMm: 12,
    centerMm: 16,
    holeMm: 10,
    faceCenterMm: 15,
    faceMm: 20,
    planeMm: 28,
  },
  agressivo: {
    vertexMm: 12,
    edgeMm: 16,
    centerMm: 24,
    holeMm: 14,
    faceCenterMm: 20,
    faceMm: 32,
    planeMm: 45,
  },
};

export type SnapResult = { point: THREE.Vector3; anchor: MeasurementAnchor; type: MeasurementType; visual: SnapVisual };

type SnapCandidate = {
  point: THREE.Vector3;
  obj: THREE.Object3D | null;
  kind: SnapKind;
  rank: number;
  distanceToHitM: number;
  distanceToSnapM: number;
  visual: SnapVisual;
};

type BoxFaceDef = { normal: THREE.Vector3; center: THREE.Vector3; corners: THREE.Vector3[] };

function isSnapMesh(obj: THREE.Object3D): obj is THREE.Mesh {
  if (!(obj as THREE.Mesh).isMesh) return false;
  if (obj.visible === false) return false;
  if (obj.userData?.isPanelEdgeOverlay) return false;
  return true;
}

function colorForKind(kind: SnapKind): string {
  if (kind === "box-vertex" || kind === "hole-center") return "#22c55e";
  if (kind === "box-edge") return "#3b82f6";
  if (kind === "box-face" || kind === "box-face-center" || kind === "wall-plane" || kind === "floor-plane") return "#ef4444";
  return "#eab308";
}

function mmToM(mm: number): number {
  return mm / 1000;
}

function thresholdForKind(kind: SnapKind, t: SnapThresholds): number {
  if (kind === "box-vertex") return t.vertexMm;
  if (kind === "box-edge") return t.edgeMm;
  if (kind === "box-center" || kind === "wall-center") return t.centerMm;
  if (kind === "hole-center") return t.holeMm;
  if (kind === "box-face-center") return t.faceCenterMm;
  if (kind === "box-face") return t.faceMm;
  if (kind === "wall-plane" || kind === "floor-plane") return t.planeMm;
  return t.faceMm;
}

function rankForKind(kind: SnapKind): number {
  if (kind === "box-vertex" || kind === "hole-center") return 0;
  if (kind === "box-edge") return 1;
  if (kind === "box-center" || kind === "wall-center" || kind === "box-face-center") return 2;
  if (kind === "box-face") return 3;
  if (kind === "wall-plane" || kind === "floor-plane") return 4;
  return 5;
}

function closestPointOnSegment(point: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
  const ab = new THREE.Vector3().subVectors(b, a);
  const denom = ab.lengthSq();
  if (denom <= 1e-12) return a.clone();
  const t = THREE.MathUtils.clamp(new THREE.Vector3().subVectors(point, a).dot(ab) / denom, 0, 1);
  return a.clone().add(ab.multiplyScalar(t));
}

function buildBoxData(box: THREE.Box3): { corners: THREE.Vector3[]; edges: Array<[number, number]>; faces: BoxFaceDef[] } {
  const min = box.min;
  const max = box.max;
  const corners = [
    new THREE.Vector3(min.x, min.y, min.z),
    new THREE.Vector3(max.x, min.y, min.z),
    new THREE.Vector3(min.x, max.y, min.z),
    new THREE.Vector3(max.x, max.y, min.z),
    new THREE.Vector3(min.x, min.y, max.z),
    new THREE.Vector3(max.x, min.y, max.z),
    new THREE.Vector3(min.x, max.y, max.z),
    new THREE.Vector3(max.x, max.y, max.z),
  ];
  const edges: Array<[number, number]> = [
    [0, 1], [2, 3], [4, 5], [6, 7],
    [0, 2], [1, 3], [4, 6], [5, 7],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  const faces: BoxFaceDef[] = [
    { normal: new THREE.Vector3(-1, 0, 0), center: new THREE.Vector3(min.x, (min.y + max.y) * 0.5, (min.z + max.z) * 0.5), corners: [corners[0], corners[2], corners[6], corners[4]] },
    { normal: new THREE.Vector3(1, 0, 0), center: new THREE.Vector3(max.x, (min.y + max.y) * 0.5, (min.z + max.z) * 0.5), corners: [corners[1], corners[3], corners[7], corners[5]] },
    { normal: new THREE.Vector3(0, -1, 0), center: new THREE.Vector3((min.x + max.x) * 0.5, min.y, (min.z + max.z) * 0.5), corners: [corners[0], corners[1], corners[5], corners[4]] },
    { normal: new THREE.Vector3(0, 1, 0), center: new THREE.Vector3((min.x + max.x) * 0.5, max.y, (min.z + max.z) * 0.5), corners: [corners[2], corners[3], corners[7], corners[6]] },
    { normal: new THREE.Vector3(0, 0, -1), center: new THREE.Vector3((min.x + max.x) * 0.5, (min.y + max.y) * 0.5, min.z), corners: [corners[0], corners[1], corners[3], corners[2]] },
    { normal: new THREE.Vector3(0, 0, 1), center: new THREE.Vector3((min.x + max.x) * 0.5, (min.y + max.y) * 0.5, max.z), corners: [corners[4], corners[5], corners[7], corners[6]] },
  ];
  return { corners, edges, faces };
}

function getClosestFace(hitPoint: THREE.Vector3, faces: BoxFaceDef[]): BoxFaceDef {
  let best = faces[0];
  let bestDist = Math.abs(best.normal.dot(new THREE.Vector3().subVectors(hitPoint, best.center)));
  for (let i = 1; i < faces.length; i += 1) {
    const d = Math.abs(faces[i].normal.dot(new THREE.Vector3().subVectors(hitPoint, faces[i].center)));
    if (d < bestDist) {
      best = faces[i];
      bestDist = d;
    }
  }
  return best;
}

function deriveHoleCandidates(mesh: THREE.Mesh, hitPoint: THREE.Vector3): SnapCandidate[] {
  const holeData = mesh.userData?.doorHolesEffective;
  if (!Array.isArray(holeData) || holeData.length === 0) return [];
  mesh.geometry.computeBoundingBox();
  const bb = mesh.geometry.boundingBox;
  if (!bb) return [];
  const size = bb.getSize(new THREE.Vector3());
  const halfW = size.x * 0.5;
  const halfH = size.y * 0.5;
  const halfT = Math.max(0.0005, size.z * 0.5);
  const hitLocal = mesh.worldToLocal(hitPoint.clone());
  const out: SnapCandidate[] = [];
  for (let i = 0; i < holeData.length; i += 1) {
    const hole = holeData[i] as { x?: number; y?: number; face?: string } | null;
    if (!hole || !Number.isFinite(hole.x) || !Number.isFinite(hole.y)) continue;
    const x = (hole.x as number) / 1000 - halfW;
    const y = halfH - (hole.y as number) / 1000;
    const z = hole.face === "tras" || hole.face === "fundo" ? halfT : -halfT;
    const local = new THREE.Vector3(x, y, z);
    const world = mesh.localToWorld(local.clone());
    out.push({
      point: world,
      obj: mesh,
      kind: "hole-center",
      rank: rankForKind("hole-center"),
      distanceToHitM: world.distanceTo(hitPoint),
      distanceToSnapM: world.distanceTo(hitPoint),
      visual: { kind: "point", color: colorForKind("hole-center"), points: [world.clone()] },
    });
    if (Math.abs(hitLocal.z - z) > 1e-6) {
      const altLocal = new THREE.Vector3(x, y, -z);
      const altWorld = mesh.localToWorld(altLocal.clone());
      out.push({
        point: altWorld,
        obj: mesh,
        kind: "hole-center",
        rank: rankForKind("hole-center"),
        distanceToHitM: altWorld.distanceTo(hitPoint),
        distanceToSnapM: altWorld.distanceTo(hitPoint),
        visual: { kind: "point", color: colorForKind("hole-center"), points: [altWorld.clone()] },
      });
    }
  }
  return out;
}

type PickOptions = { thresholds: SnapThresholds };

function pickBestCandidate(candidates: SnapCandidate[], options: PickOptions): SnapCandidate {
  const accepted = candidates.filter((c) => c.distanceToHitM <= mmToM(thresholdForKind(c.kind, options.thresholds)));
  const pool = accepted.length > 0 ? accepted : candidates;
  let best = pool[0];
  let bestScore = Number.POSITIVE_INFINITY;
  let bestRank = Number.POSITIVE_INFINITY;
  for (let i = 0; i < pool.length; i += 1) {
    const c = pool[i];
    if (!c) continue;
    const score = c.rank * 100000 + c.distanceToHitM * 1000 + c.distanceToSnapM * 100;
    if (c.rank < bestRank || (c.rank === bestRank && score < bestScore)) {
      best = c;
      bestRank = c.rank;
      bestScore = score;
    }
  }
  return best;
}

export function snapToNearest(
  raycaster: THREE.Raycaster,
  scene: THREE.Scene,
  fallbackPlaneY: number,
  preset: SnapPresetName = "normal"
): SnapResult | null {
  const hits = raycaster.intersectObjects(scene.children, true).filter((h) => isSnapMesh(h.object));
  const internalHits = hits.filter((h) => h.object.userData?.wallId == null);
  const preferredHits = internalHits.length > 0 ? internalHits : hits;
  const primaryHit = preferredHits[0];

  const fallbackPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -fallbackPlaneY);
  const fallbackPoint = new THREE.Vector3();
  const planeHit = raycaster.ray.intersectPlane(fallbackPlane, fallbackPoint);
  if (!primaryHit && !planeHit) return null;

  const hitPoint = primaryHit?.point.clone() ?? fallbackPoint.clone();
  const candidates: SnapCandidate[] = [];
  const thresholds = SNAP_PRESETS[preset] ?? SNAP_PRESETS.normal;

  if (primaryHit) {
    const mesh = primaryHit.object as THREE.Mesh;
    const box = new THREE.Box3().setFromObject(mesh);
    const boxData = buildBoxData(box);
    const objectCenter = box.getCenter(new THREE.Vector3());
    const face = getClosestFace(hitPoint, boxData.faces);
    const faceKind: SnapKind = mesh.userData?.wallId != null ? "wall-plane" : "box-face";

    candidates.push({
      point: hitPoint.clone(),
      obj: mesh,
      kind: faceKind,
      rank: rankForKind(faceKind),
      distanceToHitM: face.center.distanceTo(hitPoint),
      distanceToSnapM: hitPoint.distanceTo(hitPoint),
      visual: { kind: "face", color: colorForKind(faceKind), points: face.corners.map((p) => p.clone()) },
    });

    candidates.push({
      point: face.center.clone(),
      obj: mesh,
      kind: "box-face-center",
      rank: rankForKind("box-face-center"),
      distanceToHitM: face.center.distanceTo(hitPoint),
      distanceToSnapM: face.center.distanceTo(hitPoint),
      visual: { kind: "point", color: colorForKind("box-face-center"), points: [face.center.clone()] },
    });

    const centerKind: SnapKind = mesh.userData?.wallId != null ? "wall-center" : "box-center";
    candidates.push({
      point: objectCenter.clone(),
      obj: mesh,
      kind: centerKind,
      rank: rankForKind(centerKind),
      distanceToHitM: objectCenter.distanceTo(hitPoint),
      distanceToSnapM: objectCenter.distanceTo(hitPoint),
      visual: { kind: "point", color: colorForKind(centerKind), points: [objectCenter.clone()] },
    });

    boxData.corners.forEach((corner) => {
      candidates.push({
        point: corner.clone(),
        obj: mesh,
        kind: "box-vertex",
        rank: rankForKind("box-vertex"),
        distanceToHitM: corner.distanceTo(hitPoint),
        distanceToSnapM: corner.distanceTo(hitPoint),
        visual: { kind: "point", color: colorForKind("box-vertex"), points: [corner.clone()] },
      });
    });

    boxData.edges.forEach(([ia, ib]) => {
      const a = boxData.corners[ia];
      const b = boxData.corners[ib];
      const onEdge = closestPointOnSegment(hitPoint, a, b);
      candidates.push({
        point: onEdge,
        obj: mesh,
        kind: "box-edge",
        rank: rankForKind("box-edge"),
        distanceToHitM: onEdge.distanceTo(hitPoint),
        distanceToSnapM: onEdge.distanceTo(hitPoint),
        visual: { kind: "edge", color: colorForKind("box-edge"), points: [a.clone(), b.clone()] },
      });
    });

    candidates.push(...deriveHoleCandidates(mesh, hitPoint));

    if (mesh.userData?.wallId != null) {
      const wallFace = primaryHit.face?.normal
        ? primaryHit.face.normal.clone().transformDirection(mesh.matrixWorld).normalize()
        : face.normal.clone();
      const wallPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(wallFace, hitPoint);
      const wallPlaneHit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(wallPlane, wallPlaneHit)) {
        candidates.push({
          point: wallPlaneHit.clone(),
          obj: mesh,
          kind: "wall-plane",
          rank: rankForKind("wall-plane"),
          distanceToHitM: face.center.distanceTo(hitPoint),
          distanceToSnapM: wallPlaneHit.distanceTo(hitPoint),
          visual: { kind: "face", color: colorForKind("wall-plane"), points: face.corners.map((p) => p.clone()) },
        });
      }
    }
  }

  const floorPoint = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), floorPoint)) {
    candidates.push({
      point: floorPoint.clone(),
      obj: null,
      kind: "floor-plane",
      rank: preferredHits.length > 0 ? 5 : rankForKind("floor-plane"),
      distanceToHitM: floorPoint.distanceTo(hitPoint),
      distanceToSnapM: floorPoint.distanceTo(hitPoint),
      visual: {
        kind: "point",
        color: colorForKind("floor-plane"),
        points: [floorPoint.clone()],
      },
    });
  }

  if (candidates.length === 0) {
    const world = hitPoint.clone();
    const anchor: MeasurementAnchor = {
      objectId: null,
      localPoint: world.clone(),
      worldPoint: world.clone(),
      kind: "point",
    };
    return {
      point: world.clone(),
      anchor,
      type: "diagonal",
      visual: { kind: "point", color: colorForKind("point"), points: [world.clone()] },
    };
  }

  const best = pickBestCandidate(candidates, { thresholds });
  const anchor: MeasurementAnchor = {
    objectId: objectKey(best.obj),
    localPoint: best.obj ? best.obj.worldToLocal(best.point.clone()) : best.point.clone(),
    worldPoint: best.point.clone(),
    kind: best.kind,
  };
  return {
    point: best.point.clone(),
    anchor,
    type: deriveType(hitPoint, best.point),
    visual: {
      kind: best.visual.kind,
      color: best.visual.color,
      points: best.visual.points.map((p) => p.clone()),
    },
  };
}

