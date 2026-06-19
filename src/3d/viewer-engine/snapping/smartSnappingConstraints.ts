import * as THREE from "three";
import type { ViewerBoxEntry } from "../types";
import { setBox3FromObjectExcludingLayoutProxy } from "../box/boxAabbUtils";
import { mmToM } from "../../../utils/units";
import type { RoomBoundsLike, RoomOpeningLike } from "./smartSnappingTypes";
import {
  getWorldPosition,
  setWorldPosition,
  type DragTransformTarget,
} from "../utils/transformDragSpace";

const ROOM_INSET_M = 0;
const MM = (mm: number) => mmToM(mm);

const _worldPos = new THREE.Vector3();

function applyWorldDelta(drivenObject: THREE.Object3D, dx: number, dy: number, dz: number): void {
  if (dx === 0 && dy === 0 && dz === 0) return;
  const world = getWorldPosition(drivenObject, _worldPos);
  world.x += dx;
  world.y += dy;
  world.z += dz;
  setWorldPosition(drivenObject, world);
}

export type SmartSnapConstraintOptions = {
  wallOffsetMm?: number;
  openings?: RoomOpeningLike[];
};

/**
 * Constraints pós-snap: sobreposição, limites da sala e aberturas.
 * AABB calculado a partir do logicalMesh; deltas aplicados ao drivenObject em world space.
 */
export function applySmartSnapConstraints(params: {
  dragTransform: DragTransformTarget;
  selectedBoxId: string;
  boxes: Map<string, ViewerBoxEntry>;
  roomBounds: RoomBoundsLike | null;
  options?: SmartSnapConstraintOptions;
}): void {
  const { dragTransform, selectedBoxId, boxes, roomBounds, options } = params;
  const { drivenObject, logicalMesh } = dragTransform;
  resolveBoxOverlaps(logicalMesh, drivenObject, boxes, selectedBoxId);
  if (roomBounds) {
    clampInsideRoom(logicalMesh, roomBounds, options?.wallOffsetMm ?? 0, drivenObject);
  }
  if (options?.openings?.length) {
    resolveOpeningOverlaps(logicalMesh, drivenObject, options.openings);
  }
}

function resolveBoxOverlaps(
  logicalMesh: THREE.Object3D,
  drivenObject: THREE.Object3D,
  boxes: Map<string, ViewerBoxEntry>,
  selectedBoxId: string
): void {
  const maxIterations = 8;
  const movingBox = new THREE.Box3();
  const otherBox = new THREE.Box3();

  for (let iter = 0; iter < maxIterations; iter += 1) {
    logicalMesh.updateMatrixWorld(true);
    setBox3FromObjectExcludingLayoutProxy(movingBox, logicalMesh);
    let anyOverlap = false;

    boxes.forEach((entry, boxId) => {
      if (boxId === selectedBoxId) return;
      entry.mesh.updateMatrixWorld(true);
      setBox3FromObjectExcludingLayoutProxy(otherBox, entry.mesh);
      if (!movingBox.intersectsBox(otherBox)) return;
      anyOverlap = true;

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
        applyWorldDelta(
          drivenObject,
          movingCenter.x < otherCenter.x
            ? otherBox.min.x - movingBox.max.x
            : otherBox.max.x - movingBox.min.x,
          0,
          0
        );
      } else if (minOverlap === overlapZ) {
        applyWorldDelta(
          drivenObject,
          0,
          0,
          movingCenter.z < otherCenter.z
            ? otherBox.min.z - movingBox.max.z
            : otherBox.max.z - movingBox.min.z
        );
      } else {
        applyWorldDelta(
          drivenObject,
          0,
          movingCenter.y < otherCenter.y
            ? otherBox.min.y - movingBox.max.y
            : otherBox.max.y - movingBox.min.y,
          0
        );
      }
    });

    if (!anyOverlap) break;
  }
}

export function clampInsideRoom(
  logicalMesh: THREE.Object3D,
  roomBounds: RoomBoundsLike,
  wallOffsetMm: number,
  drivenObject: THREE.Object3D = logicalMesh
): void {
  logicalMesh.updateMatrixWorld(true);
  const movingBox = new THREE.Box3();
  setBox3FromObjectExcludingLayoutProxy(movingBox, logicalMesh);

  const wallOffsetM = MM(Math.max(0, wallOffsetMm));
  const minX = roomBounds.minX + ROOM_INSET_M + wallOffsetM;
  const maxX = roomBounds.maxX - ROOM_INSET_M - wallOffsetM;
  const minZ = roomBounds.minZ + ROOM_INSET_M + wallOffsetM;
  const maxZ = roomBounds.maxZ - ROOM_INSET_M - wallOffsetM;
  const minY = roomBounds.minY;
  const maxY = roomBounds.maxY;

  let dx = 0;
  let dy = 0;
  let dz = 0;
  if (movingBox.min.x < minX) dx += minX - movingBox.min.x;
  if (movingBox.max.x > maxX) dx -= movingBox.max.x - maxX;
  if (movingBox.min.z < minZ) dz += minZ - movingBox.min.z;
  if (movingBox.max.z > maxZ) dz -= movingBox.max.z - maxZ;
  if (movingBox.min.y < minY) dy += minY - movingBox.min.y;
  if (movingBox.max.y > maxY) dy -= movingBox.max.y - maxY;

  applyWorldDelta(drivenObject, dx, dy, dz);
}

function resolveOpeningOverlaps(
  logicalMesh: THREE.Object3D,
  drivenObject: THREE.Object3D,
  openings: RoomOpeningLike[]
): void {
  const movingBox = new THREE.Box3();

  for (const opening of openings) {
    logicalMesh.updateMatrixWorld(true);
    setBox3FromObjectExcludingLayoutProxy(movingBox, logicalMesh);

    const openingBox = new THREE.Box3(opening.min.clone(), opening.max.clone());
    if (!movingBox.intersectsBox(openingBox)) continue;

    const overlapX = Math.max(
      0,
      Math.min(movingBox.max.x, openingBox.max.x) - Math.max(movingBox.min.x, openingBox.min.x)
    );
    const overlapZ = Math.max(
      0,
      Math.min(movingBox.max.z, openingBox.max.z) - Math.max(movingBox.min.z, openingBox.min.z)
    );
    const overlapY = Math.max(
      0,
      Math.min(movingBox.max.y, openingBox.max.y) - Math.max(movingBox.min.y, openingBox.min.y)
    );
    const minOverlap = Math.min(overlapX, overlapZ, overlapY);
    if (minOverlap <= 0) continue;

    const movingCenter = new THREE.Vector3();
    movingBox.getCenter(movingCenter);
    const openingCenter = new THREE.Vector3();
    openingBox.getCenter(openingCenter);

    if (minOverlap === overlapX) {
      applyWorldDelta(
        drivenObject,
        movingCenter.x < openingCenter.x
          ? openingBox.min.x - movingBox.max.x
          : openingBox.max.x - movingBox.min.x,
        0,
        0
      );
    } else if (minOverlap === overlapZ) {
      applyWorldDelta(
        drivenObject,
        0,
        0,
        movingCenter.z < openingCenter.z
          ? openingBox.min.z - movingBox.max.z
          : openingBox.max.z - movingBox.min.z
      );
    } else {
      applyWorldDelta(
        drivenObject,
        0,
        movingCenter.y < openingCenter.y
          ? openingBox.min.y - movingBox.max.y
          : openingBox.max.y - movingBox.min.y,
        0
      );
    }
  }
}
