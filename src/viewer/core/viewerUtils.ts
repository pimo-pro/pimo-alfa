import * as THREE from "three";

import {
  isViewerLayoutProxyObject,
  setBox3FromObjectExcludingLayoutProxy,
} from "@/3d/viewer-engine/box/boxAabbUtils";
import type { RulerMeasurementHit } from "@/3d/viewer-engine/measurement/unifiedMeasurementTypes";
import type { Aabb3, ParametricRulerHit } from "@/3d/viewer-engine/measurement/parametricDimensions";

export type RoomBoundsXZ = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

/**
 * Propaga userData.boxId e layer 0 para todos os filhos do grupo da caixa.
 * O proxy de layout (`viewerLayoutBounds`) fica na layer dedicada (raycaster/picking = layer 0).
 */
export function tagBoxGroupWithId(group: THREE.Object3D, boxId: string): void {
  group.traverse((child) => {
    if (isViewerLayoutProxyObject(child)) return;
    child.userData = child.userData || {};
    child.userData.boxId = boxId;
    if (child.layers && typeof child.layers.set === "function") {
      child.layers.set(0);
    }
  });
}

export function aabb3FromThreeBox3(b: THREE.Box3): Aabb3 {
  return {
    min: { x: b.min.x, y: b.min.y, z: b.min.z },
    max: { x: b.max.x, y: b.max.y, z: b.max.z },
  };
}

export function parametricRulerHitToThree(hit: ParametricRulerHit): RulerMeasurementHit {
  return {
    kind: hit.kind,
    distanceM: hit.distanceM,
    start: new THREE.Vector3(hit.start.x, hit.start.y, hit.start.z),
    end: new THREE.Vector3(hit.end.x, hit.end.y, hit.end.z),
  };
}

/**
 * Caixa segue lógica da sala apenas quando está dentro ou encostada ao perímetro em X/Z.
 */
export function isMeshInsideOrTouchingRoomBounds(
  movingMesh: THREE.Object3D,
  roomBounds: RoomBoundsXZ,
  tolerance = 0.02,
  targetBox = new THREE.Box3(),
): boolean {
  movingMesh.updateMatrixWorld(true);
  setBox3FromObjectExcludingLayoutProxy(targetBox, movingMesh);
  const { minX, maxX, minZ, maxZ } = roomBounds;
  return !(
    targetBox.max.x < minX - tolerance ||
    targetBox.min.x > maxX + tolerance ||
    targetBox.max.z < minZ - tolerance ||
    targetBox.min.z > maxZ + tolerance
  );
}

export function clearSnapUserData(object: THREE.Object3D): void {
  const snapData = object.userData as Record<string, unknown>;
  delete snapData.currentWallId;
  delete snapData.lastWallId;
  delete snapData.movementDirection;
  delete snapData.lastSnapPosition;
}

export function getTransformGizmoSizeForBox(entry: { width: number; height: number; depth: number }): number {
  const maxDimension = Math.max(entry.width, entry.height, entry.depth);
  return THREE.MathUtils.clamp(maxDimension * 0.45, 0.22, 0.5);
}
