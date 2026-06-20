import * as THREE from "three";
import type { ViewerBoxEntry } from "../types";
import { setBox3FromObjectExcludingLayoutProxy } from "../box/boxAabbUtils";
import { mmToM } from "../../../utils/units";
import type { RoomBoundsLike, RoomOpeningLike } from "./smartSnappingTypes";

const ROOM_INSET_M = 0;
const MM = (mm: number) => mmToM(mm);

export type SmartSnapConstraintOptions = {
  wallOffsetMm?: number;
  openings?: RoomOpeningLike[];
};

/**
 * Constraints pós-snap: sobreposição, limites da sala e aberturas.
 */
export function applySmartSnapConstraints(params: {
  mesh: THREE.Object3D;
  selectedBoxId: string;
  boxes: Map<string, ViewerBoxEntry>;
  roomBounds: RoomBoundsLike | null;
  options?: SmartSnapConstraintOptions;
}): void {
  const { mesh, selectedBoxId, boxes, roomBounds, options } = params;
  resolveBoxOverlaps(mesh, boxes, selectedBoxId);
  if (roomBounds) {
    clampInsideRoom(mesh, roomBounds, options?.wallOffsetMm ?? 0);
  }
  if (options?.openings?.length) {
    resolveOpeningOverlaps(mesh, options.openings);
  }
}

function resolveBoxOverlaps(
  movingMesh: THREE.Object3D,
  boxes: Map<string, ViewerBoxEntry>,
  selectedBoxId: string
): void {
  const maxIterations = 8;
  const movingBox = new THREE.Box3();
  const otherBox = new THREE.Box3();

  for (let iter = 0; iter < maxIterations; iter += 1) {
    movingMesh.updateMatrixWorld(true);
    setBox3FromObjectExcludingLayoutProxy(movingBox, movingMesh);
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
    });

    if (!anyOverlap) break;
  }
}

export function clampInsideRoom(movingMesh: THREE.Object3D, roomBounds: RoomBoundsLike, wallOffsetMm: number): void {
  movingMesh.updateMatrixWorld(true);
  const movingBox = new THREE.Box3();
  setBox3FromObjectExcludingLayoutProxy(movingBox, movingMesh);

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

  if (dx !== 0 || dy !== 0 || dz !== 0) {
    movingMesh.position.x += dx;
    movingMesh.position.y += dy;
    movingMesh.position.z += dz;
  }
}

function resolveOpeningOverlaps(movingMesh: THREE.Object3D, openings: RoomOpeningLike[]): void {
  movingMesh.updateMatrixWorld(true);
  const movingBox = new THREE.Box3();
  setBox3FromObjectExcludingLayoutProxy(movingBox, movingMesh);

  for (const opening of openings) {
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
      movingMesh.position.x +=
        movingCenter.x < openingCenter.x
          ? openingBox.min.x - movingBox.max.x
          : openingBox.max.x - movingBox.min.x;
    } else if (minOverlap === overlapZ) {
      movingMesh.position.z +=
        movingCenter.z < openingCenter.z
          ? openingBox.min.z - movingBox.max.z
          : openingBox.max.z - movingBox.min.z;
    } else {
      movingMesh.position.y +=
        movingCenter.y < openingCenter.y
          ? openingBox.min.y - movingBox.max.y
          : openingBox.max.y - movingBox.min.y;
    }

    movingMesh.updateMatrixWorld(true);
    setBox3FromObjectExcludingLayoutProxy(movingBox, movingMesh);
  }
}
