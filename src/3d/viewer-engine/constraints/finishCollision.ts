import * as THREE from "three";
import type { ViewerBoxEntry } from "../types";
import { setBox3FromObjectExcludingLayoutProxy } from "../box/boxAabbUtils";
import { keepModelInsideRoom, preventModelWallIntersection } from "../../collision/ModelCollision";
import { clampInsideRoom } from "../snapping/smartSnappingConstraints";
import type { RoomBoundsLike } from "../snapping/smartSnappingTypes";

const PANEL_THICKNESS_M = 0.019;
const OVERLAP_EPS_M = 1e-4;

export type ParentBoxCollisionEntry = {
  boxId: string;
  mesh: THREE.Object3D;
  width: number;
  height: number;
  depth: number;
};

/** Par REMATE_L_ext ↔ REMATE_L_int do mesmo grupo — única exceção ao Lock. */
export function isRemateLPartnerPair(moving: THREE.Object3D, other: THREE.Object3D): boolean {
  const a = moving.userData;
  const b = other.userData;
  if (!a?.isRematePiece || !b?.isRematePiece) return false;
  const aIsL = a.remateProductType === "L" || a.remateTipo === "L";
  const bIsL = b.remateProductType === "L" || b.remateTipo === "L";
  if (!aIsL || !bIsL) return false;
  const groupA = a.remateParentGroupId;
  const groupB = b.remateParentGroupId;
  if (!groupA || groupA !== groupB) return false;
  const partA = a.rematePartIndex;
  const partB = b.rematePartIndex;
  return (partA === 1 && partB === 2) || (partA === 2 && partB === 1);
}

export function allowedRemateLPartnerOverlapM(moving: THREE.Object3D, other: THREE.Object3D): number {
  const dA = Number(moving.userData?.remateDepthMm) || 19;
  const dB = Number(other.userData?.remateDepthMm) || 19;
  return Math.min(dA, dB) / 1000;
}

export function computeBoxInteriorWorldBox(
  boxMesh: THREE.Object3D,
  widthM: number,
  heightM: number,
  depthM: number,
  panelThicknessM = PANEL_THICKNESS_M
): THREE.Box3 {
  const halfW = widthM / 2;
  const halfH = heightM / 2;
  const halfD = depthM / 2;
  const t = panelThicknessM;
  const localInner = new THREE.Box3(
    new THREE.Vector3(-halfW + t, -halfH + t, -halfD + t),
    new THREE.Vector3(halfW - t, halfH - t, halfD - t)
  );
  return localInner.applyMatrix4(boxMesh.matrixWorld);
}

function separateAabbOverlap(
  movingMesh: THREE.Object3D,
  movingBox: THREE.Box3,
  otherBox: THREE.Box3
): void {
  const overlapX = Math.max(
    0,
    Math.min(movingBox.max.x, otherBox.max.x) - Math.max(movingBox.min.x, otherBox.min.x)
  );
  const overlapZ = Math.max(
    0,
    Math.min(movingBox.max.z, otherBox.max.z) - Math.max(movingBox.min.z, otherBox.min.z)
  );
  const overlapY = Math.max(
    0,
    Math.min(movingBox.max.y, otherBox.max.y) - Math.max(movingBox.min.y, otherBox.min.y)
  );
  const minOverlap = Math.min(overlapX, overlapZ, overlapY);
  if (minOverlap <= 0) return;

  const movingCenter = new THREE.Vector3();
  movingBox.getCenter(movingCenter);
  const otherCenter = new THREE.Vector3();
  otherBox.getCenter(otherCenter);

  if (minOverlap === overlapX) {
    movingMesh.position.x +=
      movingCenter.x < otherCenter.x
        ? otherBox.min.x - movingBox.max.x
        : otherBox.max.x - movingBox.min.x;
  } else if (minOverlap === overlapZ) {
    movingMesh.position.z +=
      movingCenter.z < otherCenter.z
        ? otherBox.min.z - movingBox.max.z
        : otherBox.max.z - movingBox.min.z;
  } else {
    movingMesh.position.y +=
      movingCenter.y < otherCenter.y
        ? otherBox.min.y - movingBox.max.y
        : otherBox.max.y - movingBox.min.y;
  }
}

function resolveInteriorPenetration(
  movingMesh: THREE.Object3D,
  parentBox: ParentBoxCollisionEntry,
  movingBox: THREE.Box3,
  innerBox: THREE.Box3
): boolean {
  let changed = false;
  for (let step = 0; step < 8; step += 1) {
    movingMesh.updateMatrixWorld(true);
    setBox3FromObjectExcludingLayoutProxy(movingBox, movingMesh);
    innerBox.copy(
      computeBoxInteriorWorldBox(parentBox.mesh, parentBox.width, parentBox.height, parentBox.depth)
    );
    if (!movingBox.intersectsBox(innerBox)) break;
    separateAabbOverlap(movingMesh, movingBox, innerBox);
    changed = true;
  }
  return changed;
}

/**
 * Impede remates/rodapés de penetrarem outras peças quando o bloqueio está activo.
 * Caixa pai: só volume interior (não exclui colisão — impede atravessar a carcaça).
 * Exceção única: encaixe REMATE_L_ext ↔ REMATE_L_int limitado à espessura da chapa.
 */
export function resolveFinishMeshOverlaps(params: {
  movingMesh: THREE.Object3D;
  boxes: Map<string, ViewerBoxEntry>;
  excludeBoxIds?: Set<string>;
  otherMeshes: THREE.Object3D[];
  parentBox?: ParentBoxCollisionEntry;
}): void {
  const { movingMesh, boxes, excludeBoxIds, otherMeshes, parentBox } = params;
  const maxIterations = 8;
  const movingBox = new THREE.Box3();
  const otherBox = new THREE.Box3();
  const innerBox = new THREE.Box3();

  const boxObstacles = Array.from(boxes.entries())
    .filter(([id]) => !excludeBoxIds?.has(id))
    .filter(([id]) => id !== parentBox?.boxId)
    .map(([, entry]) => entry.mesh);

  const obstacles: THREE.Object3D[] = [...otherMeshes, ...boxObstacles];

  for (let iter = 0; iter < maxIterations; iter += 1) {
    movingMesh.updateMatrixWorld(true);
    setBox3FromObjectExcludingLayoutProxy(movingBox, movingMesh);
    let anyOverlap = false;

    for (const other of obstacles) {
      if (other === movingMesh) continue;
      other.updateMatrixWorld(true);
      setBox3FromObjectExcludingLayoutProxy(otherBox, other);
      if (!movingBox.intersectsBox(otherBox)) continue;

      if (isRemateLPartnerPair(movingMesh, other)) {
        const overlapX = Math.max(
          0,
          Math.min(movingBox.max.x, otherBox.max.x) - Math.max(movingBox.min.x, otherBox.min.x)
        );
        const overlapZ = Math.max(
          0,
          Math.min(movingBox.max.z, otherBox.max.z) - Math.max(movingBox.min.z, otherBox.min.z)
        );
        const overlapY = Math.max(
          0,
          Math.min(movingBox.max.y, otherBox.max.y) - Math.max(movingBox.min.y, otherBox.min.y)
        );
        const minOverlap = Math.min(overlapX, overlapZ, overlapY);
        if (minOverlap <= allowedRemateLPartnerOverlapM(movingMesh, other) + OVERLAP_EPS_M) {
          continue;
        }
      }

      anyOverlap = true;
      separateAabbOverlap(movingMesh, movingBox, otherBox);
    }

    if (parentBox) {
      if (resolveInteriorPenetration(movingMesh, parentBox, movingBox, innerBox)) {
        anyOverlap = true;
      }
    }

    if (!anyOverlap) break;
  }
}

/**
 * Aplica chão + sala + paredes + overlap — alinhado com o pipeline das caixas.
 */
export function applyFinishMovementConstraints(params: {
  movingMesh: THREE.Object3D;
  boxes: Map<string, ViewerBoxEntry>;
  excludeBoxIds?: Set<string>;
  otherMeshes: THREE.Object3D[];
  parentBox?: ParentBoxCollisionEntry;
  applyFloorConstraint: (_mesh: THREE.Object3D) => void;
  roomBounds: RoomBoundsLike | null;
  roomWallMeshes: THREE.Mesh[];
  isInsideRoom: (_mesh: THREE.Object3D) => boolean;
}): void {
  const {
    movingMesh,
    boxes,
    excludeBoxIds,
    otherMeshes,
    parentBox,
    applyFloorConstraint,
    roomBounds,
    roomWallMeshes,
    isInsideRoom,
  } = params;

  resolveFinishMeshOverlaps({ movingMesh, boxes, excludeBoxIds, otherMeshes, parentBox });
  applyFloorConstraint(movingMesh);

  if (roomBounds && isInsideRoom(movingMesh)) {
    preventModelWallIntersection(movingMesh, roomWallMeshes);
    keepModelInsideRoom(movingMesh, roomBounds);
    clampInsideRoom(movingMesh, roomBounds, 0);
  }

  resolveFinishMeshOverlaps({ movingMesh, boxes, excludeBoxIds, otherMeshes, parentBox });
  applyFloorConstraint(movingMesh);
}
