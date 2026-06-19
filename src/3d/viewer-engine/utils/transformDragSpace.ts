import * as THREE from "three";

/** Objecto movido pelo TransformControls e mesh cuja geometria/AABB define o snap. */
export type DragTransformTarget = {
  drivenObject: THREE.Object3D;
  logicalMesh: THREE.Object3D;
};

/**
 * Resolve o par driven/logical durante drag de translate.
 * Com pivô activo, o TransformControls move o pivô; o mesh lógico é o filho attachado.
 */
export function resolveDragTransformTarget(
  logicalMesh: THREE.Object3D,
  controlledObject: THREE.Object3D | null,
  pivotActive: boolean
): DragTransformTarget {
  if (pivotActive && controlledObject != null) {
    return { drivenObject: controlledObject, logicalMesh };
  }
  return { drivenObject: logicalMesh, logicalMesh };
}

export function getWorldPosition(obj: THREE.Object3D, target = new THREE.Vector3()): THREE.Vector3 {
  return obj.getWorldPosition(target);
}

export function setWorldPosition(obj: THREE.Object3D, worldPos: THREE.Vector3): void {
  if (obj.parent) {
    const local = worldPos.clone();
    obj.parent.worldToLocal(local);
    obj.position.copy(local);
  } else {
    obj.position.copy(worldPos);
  }
  obj.updateMatrixWorld(true);
}
