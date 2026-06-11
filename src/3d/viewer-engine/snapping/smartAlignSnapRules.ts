import * as THREE from "three";
import { computeRodapePlacementLocal } from "../../../core/rodape/rodapePlacement";
import { getStructuralBoundsM } from "../../../core/rodape/rodapePlacement";
import type { ProjectRodape } from "../../../core/rodape/rodapeTypes";
import type { RemateSnapPlane, RemateSnapTargetKind } from "./remateSnapTargets";
import { signedDistanceRemateFaceToPlane } from "./remateSnapTargets";
import type { BoxAabb } from "./smartSnappingTypes";
import { boxesOverlapOnAxis } from "./smartSnappingTypes";
import type { ExplicitAlignMode } from "./smartAlignSnapTypes";

const RODAPE_BASE_GAP_M = 0.002;

export function deltaForFlushAlign(
  moving: BoxAabb,
  other: BoxAabb,
  mode: ExplicitAlignMode
): THREE.Vector3 | null {
  switch (mode) {
    case "front":
    case "flushFront":
      return faceDelta(moving.max.z, other.max.z, "z");
    case "back":
    case "flushBack":
      return faceDelta(moving.min.z, other.min.z, "z");
    case "left":
    case "flushLeft":
      return faceDelta(moving.min.x, other.min.x, "x");
    case "right":
    case "flushRight":
      return faceDelta(moving.max.x, other.max.x, "x");
    case "top":
      return faceDelta(moving.max.y, other.max.y, "y");
    case "bottom":
      return faceDelta(moving.min.y, other.min.y, "y");
    case "depthAlign": {
      const targets = [
        { gap: other.min.z - moving.min.z, axis: "z" as const },
        { gap: other.max.z - moving.max.z, axis: "z" as const },
        { gap: other.center.z - moving.center.z, axis: "z" as const },
      ];
      let best = targets[0]!;
      for (const t of targets) {
        if (Math.abs(t.gap) < Math.abs(best.gap)) best = t;
      }
      const delta = new THREE.Vector3();
      delta[best.axis] = best.gap;
      return delta;
    }
    default:
      return null;
  }
}

function faceDelta(movingVal: number, otherVal: number, axis: "x" | "y" | "z"): THREE.Vector3 {
  const delta = new THREE.Vector3();
  delta[axis] = otherVal - movingVal;
  return delta;
}

export function flushLateralRequiresOverlap(mode: ExplicitAlignMode): boolean {
  return mode === "flushLeft" || mode === "flushRight" || mode === "flushFront" || mode === "flushBack";
}

export function flushHasOverlap(moving: BoxAabb, other: BoxAabb, mode: ExplicitAlignMode): boolean {
  if (!flushLateralRequiresOverlap(mode)) return true;
  if (mode === "flushLeft" || mode === "flushRight") return boxesOverlapOnAxis(moving, other, "z");
  if (mode === "flushFront" || mode === "flushBack") return boxesOverlapOnAxis(moving, other, "x");
  return true;
}

/** Posição mundo alvo do rodapé segundo regras industriais (somente leitura de rodapePlacement). */
export function rodapeTargetWorldPosition(
  rodape: ProjectRodape,
  boxMesh: THREE.Object3D,
  widthM: number,
  heightM: number,
  depthM: number
): THREE.Vector3 {
  const bounds = getStructuralBoundsM(widthM, heightM, depthM);
  const local = computeRodapePlacementLocal(rodape, bounds);
  boxMesh.updateMatrixWorld(true);
  return new THREE.Vector3(local.position[0], local.position[1], local.position[2]).applyMatrix4(
    boxMesh.matrixWorld
  );
}

export function rodapeThicknessM(rodape: ProjectRodape): number {
  return Math.max(0.001, rodape.thicknessMm / 1000);
}

export function rodapeHeightM(rodape: ProjectRodape): number {
  return Math.max(0.001, (rodape.dimensions.heightMm ?? rodape.heightMm) / 1000);
}

export function collectRodapeBoxSnapDeltas(params: {
  rodapeAabb: BoxAabb;
  meshPosition: THREE.Vector3;
  rodape: ProjectRodape;
  boxAabb: BoxAabb;
  boxMesh: THREE.Object3D;
  widthM: number;
  heightM: number;
  depthM: number;
  captureM: number;
}): Array<{ delta: THREE.Vector3; distanceM: number; kind: string; priority: number }> {
  const { rodapeAabb, meshPosition, rodape, boxAabb, boxMesh, widthM, heightM, depthM, captureM } = params;
  const out: Array<{ delta: THREE.Vector3; distanceM: number; kind: string; priority: number }> = [];

  const targetCenter = rodapeTargetWorldPosition(rodape, boxMesh, widthM, heightM, depthM);
  const placementDelta = targetCenter.clone().sub(meshPosition);
  const placementDist = placementDelta.length();
  if (placementDist <= captureM) {
    out.push({ delta: placementDelta, distanceM: placementDist, kind: "rodape_placement", priority: 0 });
  }

  const bounds = getStructuralBoundsM(widthM, heightM, depthM);
  boxMesh.updateMatrixWorld(true);
  const boxBottomY = boxMesh
    .localToWorld(new THREE.Vector3(bounds.centerX, bounds.minY, bounds.centerZ))
    .y;
  const targetTopY = boxBottomY - RODAPE_BASE_GAP_M;
  const heightGap = targetTopY - rodapeAabb.max.y;
  if (Math.abs(heightGap) <= captureM) {
    out.push({
      delta: new THREE.Vector3(0, heightGap, 0),
      distanceM: Math.abs(heightGap),
      kind: "rodape_base_height",
      priority: 1,
    });
  }

  const lateralPairs: Array<{ moving: number; target: number; kind: string }> = [
    { moving: rodapeAabb.center.x, target: boxAabb.center.x, kind: "rodape_lateral_center" },
    { moving: rodapeAabb.min.x, target: boxAabb.min.x, kind: "rodape_lateral_left" },
    { moving: rodapeAabb.max.x, target: boxAabb.max.x, kind: "rodape_lateral_right" },
  ];
  for (const pair of lateralPairs) {
    const gap = pair.target - pair.moving;
    const distanceM = Math.abs(gap);
    if (distanceM > captureM) continue;
    out.push({
      delta: new THREE.Vector3(gap, 0, 0),
      distanceM,
      kind: pair.kind,
      priority: 2,
    });
  }

  const cornerPairs: Array<{ dx: number; dz: number; kind: string }> = [
    { dx: boxAabb.min.x - rodapeAabb.min.x, dz: boxAabb.min.z - rodapeAabb.min.z, kind: "rodape_corner_bl" },
    { dx: boxAabb.max.x - rodapeAabb.max.x, dz: boxAabb.max.z - rodapeAabb.max.z, kind: "rodape_corner_fr" },
    { dx: boxAabb.min.x - rodapeAabb.min.x, dz: boxAabb.max.z - rodapeAabb.max.z, kind: "rodape_corner_fl" },
    { dx: boxAabb.max.x - rodapeAabb.max.x, dz: boxAabb.min.z - rodapeAabb.min.z, kind: "rodape_corner_br" },
  ];
  for (const c of cornerPairs) {
    const distanceM = Math.hypot(c.dx, c.dz);
    if (distanceM > captureM) continue;
    out.push({
      delta: new THREE.Vector3(c.dx, 0, c.dz),
      distanceM,
      kind: c.kind,
      priority: 3,
    });
  }

  return out;
}

export function remateRodapeContinuityDelta(
  remateAabb: BoxAabb,
  rodapeAabb: BoxAabb
): { delta: THREE.Vector3; distanceM: number } {
  const deltaX = rodapeAabb.center.x - remateAabb.center.x;
  const deltaY = rodapeAabb.max.y - remateAabb.min.y;
  const deltaZFront = rodapeAabb.max.z - remateAabb.max.z;
  const deltaZBack = rodapeAabb.min.z - remateAabb.min.z;
  const deltaZ = Math.abs(deltaZFront) <= Math.abs(deltaZBack) ? deltaZFront : deltaZBack;
  const delta = new THREE.Vector3(deltaX, deltaY, deltaZ);
  return { delta, distanceM: delta.length() };
}

/** Delta para mover rodapé em continuidade com remate (inverso visual). */
export function rodapeRemateContinuityDelta(
  rodapeAabb: BoxAabb,
  remateAabb: BoxAabb
): { delta: THREE.Vector3; distanceM: number } {
  const deltaX = remateAabb.center.x - rodapeAabb.center.x;
  const deltaY = remateAabb.min.y - rodapeAabb.max.y;
  const deltaZFront = remateAabb.max.z - rodapeAabb.max.z;
  const deltaZBack = remateAabb.min.z - rodapeAabb.min.z;
  const deltaZ = Math.abs(deltaZFront) <= Math.abs(deltaZBack) ? deltaZFront : deltaZBack;
  const delta = new THREE.Vector3(deltaX, deltaY, deltaZ);
  return { delta, distanceM: delta.length() };
}

export function remateFeaturePlaneDeltaWorld(params: {
  remateLocalBox: THREE.Box3;
  plane: RemateSnapPlane;
  boxMatrixWorld: THREE.Matrix4;
}): THREE.Vector3 {
  const signedM = signedDistanceRemateFaceToPlane(params.remateLocalBox, params.plane);
  const deltaLocal = params.plane.normalM.clone().multiplyScalar(-signedM);
  return deltaLocal.transformDirection(params.boxMatrixWorld);
}

export function isFeatureKind(kind: RemateSnapTargetKind): boolean {
  return kind === "DOOR_FRONT" || kind === "DRAWER_FRONT";
}

/** Flush / stack / depth entre duas caixas (par único). */
export function collectBoxPairAlignDeltas(
  moving: BoxAabb,
  other: BoxAabb,
  captureM: number
): Array<{ delta: THREE.Vector3; distanceM: number; kind: string; priority: number }> {
  const out: Array<{ delta: THREE.Vector3; distanceM: number; kind: string; priority: number }> = [];

  const flushPairs: Array<{ movingVal: number; otherVal: number; axis: "x" | "z"; kind: string }> = [
    { movingVal: moving.max.x, otherVal: other.min.x, axis: "x", kind: "autoFlush" },
    { movingVal: moving.min.x, otherVal: other.max.x, axis: "x", kind: "autoFlush" },
    { movingVal: moving.max.z, otherVal: other.min.z, axis: "z", kind: "autoFlush" },
    { movingVal: moving.min.z, otherVal: other.max.z, axis: "z", kind: "autoFlush" },
  ];
  for (const pair of flushPairs) {
    const gap = pair.otherVal - pair.movingVal;
    const distanceM = Math.abs(gap);
    if (distanceM > captureM) continue;
    const perpAxis = pair.axis === "x" ? "z" : "x";
    if (!boxesOverlapOnAxis(moving, other, perpAxis)) continue;
    const delta = new THREE.Vector3();
    delta[pair.axis] = gap;
    out.push({ delta, distanceM, kind: pair.kind, priority: 5 });
  }

  if (boxesOverlapOnAxis(moving, other, "x") && boxesOverlapOnAxis(moving, other, "z")) {
    const gap = other.max.y - moving.min.y;
    const distanceM = Math.abs(gap);
    if (distanceM <= captureM) {
      out.push({ delta: new THREE.Vector3(0, gap, 0), distanceM, kind: "autoStack", priority: 6 });
    }
  }

  if (boxesOverlapOnAxis(moving, other, "x")) {
    for (const t of [
      { val: other.min.z, movingVal: moving.min.z },
      { val: other.max.z, movingVal: moving.max.z },
      { val: other.center.z, movingVal: moving.center.z },
    ]) {
      const deltaVal = t.val - t.movingVal;
      const distanceM = Math.abs(deltaVal);
      if (distanceM > captureM) continue;
      out.push({
        delta: new THREE.Vector3(0, 0, deltaVal),
        distanceM,
        kind: "autoDepth",
        priority: 7,
      });
    }
  }

  return out;
}

const MICRO_GAP_M = 0.001;

/** Canto↔canto e centro↔centro entre caixas. */
export function collectBoxCornerCenterDeltas(
  moving: BoxAabb,
  other: BoxAabb,
  captureM: number
): Array<{ delta: THREE.Vector3; distanceM: number; kind: string; priority: number }> {
  const out: Array<{ delta: THREE.Vector3; distanceM: number; kind: string; priority: number }> = [];
  const movingCorners = cornersOfBox(moving);
  const otherCorners = cornersOfBox(other);
  for (const mc of movingCorners) {
    for (const oc of otherCorners) {
      const delta = oc.clone().sub(mc);
      const distanceM = delta.length();
      if (distanceM > captureM) continue;
      out.push({ delta, distanceM, kind: "corner", priority: 8 });
    }
  }
  const centerDelta = other.center.clone().sub(moving.center);
  const centerDist = centerDelta.length();
  if (centerDist <= captureM) {
    out.push({ delta: centerDelta, distanceM: centerDist, kind: "center_align", priority: 9 });
  }
  const topGap = other.max.y - moving.max.y;
  if (Math.abs(topGap) <= captureM) {
    out.push({
      delta: new THREE.Vector3(0, topGap, 0),
      distanceM: Math.abs(topGap),
      kind: "top_thickness_align",
      priority: 10,
    });
  }
  return out;
}

function cornersOfBox(aabb: BoxAabb): THREE.Vector3[] {
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

/** Snap remate vertical (topo) ou lateral (DIR/ESQ). */
export function collectRemateStructuralExtras(params: {
  remateAabb: BoxAabb;
  boxAabb: BoxAabb;
  mountSlot?: string;
  captureM: number;
}): Array<{ delta: THREE.Vector3; distanceM: number; kind: string; priority: number }> {
  const { remateAabb, boxAabb, mountSlot, captureM } = params;
  const out: Array<{ delta: THREE.Vector3; distanceM: number; kind: string; priority: number }> = [];
  const isVertical = mountSlot === "CIMA" || mountSlot === "FUNDO" || mountSlot === "FRENTE" || mountSlot === "TRAS";
  const isLateral = mountSlot === "DIR" || mountSlot === "ESQ";

  if (isVertical) {
    const gap = boxAabb.max.y - remateAabb.max.y;
    if (Math.abs(gap) <= captureM) {
      out.push({ delta: new THREE.Vector3(0, gap, 0), distanceM: Math.abs(gap), kind: "BOX_CIMA", priority: 2 });
    }
  }
  if (isLateral) {
    const targetX = mountSlot === "DIR" ? boxAabb.max.x : boxAabb.min.x;
    const movingX = mountSlot === "DIR" ? remateAabb.min.x : remateAabb.max.x;
    const gap = targetX - movingX;
    if (Math.abs(gap) <= captureM) {
      const kind = mountSlot === "DIR" ? "BOX_DIR" : "BOX_ESQ";
      out.push({ delta: new THREE.Vector3(gap, 0, 0), distanceM: Math.abs(gap), kind, priority: 2 });
    }
  }
  return out;
}

export type RoomBoundsLike = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

/** Rodapé: cadeia, canto sala, micro-gaps. */
export function collectRodapeExtendedDeltas(params: {
  rodapeAabb: BoxAabb;
  meshPosition: THREE.Vector3;
  siblingRodapes: Array<{ aabb: BoxAabb; meshPosition: THREE.Vector3 }>;
  boxAabb: BoxAabb;
  roomBounds: RoomBoundsLike | null;
  captureM: number;
}): Array<{ delta: THREE.Vector3; distanceM: number; kind: string; priority: number }> {
  const { rodapeAabb, meshPosition, siblingRodapes, boxAabb, roomBounds, captureM } = params;
  const out: Array<{ delta: THREE.Vector3; distanceM: number; kind: string; priority: number }> = [];

  for (const sib of siblingRodapes) {
    const gapX = sib.aabb.min.x - rodapeAabb.max.x;
    const gapX2 = sib.aabb.max.x - rodapeAabb.min.x;
    for (const gap of [gapX, gapX2]) {
      if (Math.abs(gap) > captureM) continue;
      out.push({
        delta: new THREE.Vector3(gap, 0, 0),
        distanceM: Math.abs(gap),
        kind: "rodape_chain",
        priority: 4,
      });
    }
  }

  if (roomBounds) {
    const corners = [
      { x: roomBounds.minX, z: roomBounds.minZ },
      { x: roomBounds.maxX, z: roomBounds.minZ },
      { x: roomBounds.minX, z: roomBounds.maxZ },
      { x: roomBounds.maxX, z: roomBounds.maxZ },
    ];
    for (const c of corners) {
      const dx = c.x - (c.x < rodapeAabb.center.x ? rodapeAabb.min.x : rodapeAabb.max.x);
      const dz = c.z - (c.z < rodapeAabb.center.z ? rodapeAabb.min.z : rodapeAabb.max.z);
      const distanceM = Math.hypot(dx, dz);
      if (distanceM > captureM) continue;
      out.push({
        delta: new THREE.Vector3(dx, 0, dz),
        distanceM,
        kind: "rodape_room_corner",
        priority: 3,
      });
    }
  }

  for (const axis of ["x", "y", "z"] as const) {
    const minGap = boxAabb.min[axis] - rodapeAabb.max[axis];
    const maxGap = boxAabb.max[axis] - rodapeAabb.min[axis];
    for (const gap of [minGap, maxGap]) {
      if (Math.abs(gap) > 0 && Math.abs(gap) < MICRO_GAP_M) {
        const delta = new THREE.Vector3();
        delta[axis] = gap;
        out.push({ delta, distanceM: Math.abs(gap), kind: "rodape_micro_gap", priority: 1 });
      }
    }
  }

  void meshPosition;
  return out;
}
