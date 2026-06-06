import * as THREE from "three";
import type { ViewerBoxEntry } from "../types";
import { setBox3FromObjectExcludingLayoutProxy } from "../box/boxAabbUtils";

/**
 * Impede remates/rodapés de penetrarem outras peças quando o bloqueio está activo.
 * Exclui a caixa pai (montagem na face) e a própria mesh em movimento.
 */
export function resolveFinishMeshOverlaps(params: {
  movingMesh: THREE.Object3D;
  boxes: Map<string, ViewerBoxEntry>;
  excludeBoxIds?: Set<string>;
  otherMeshes: THREE.Object3D[];
}): void {
  const { movingMesh, boxes, excludeBoxIds, otherMeshes } = params;
  const maxIterations = 8;
  const movingBox = new THREE.Box3();
  const otherBox = new THREE.Box3();

  const obstacles: THREE.Object3D[] = [
    ...otherMeshes,
    ...Array.from(boxes.entries())
      .filter(([id]) => !excludeBoxIds?.has(id))
      .map(([, entry]) => entry.mesh),
  ];

  for (let iter = 0; iter < maxIterations; iter += 1) {
    movingMesh.updateMatrixWorld(true);
    setBox3FromObjectExcludingLayoutProxy(movingBox, movingMesh);
    let anyOverlap = false;

    for (const other of obstacles) {
      if (other === movingMesh) continue;
      other.updateMatrixWorld(true);
      setBox3FromObjectExcludingLayoutProxy(otherBox, other);
      if (!movingBox.intersectsBox(otherBox)) continue;
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
      if (minOverlap <= 0) continue;

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

    if (!anyOverlap) break;
  }
}
