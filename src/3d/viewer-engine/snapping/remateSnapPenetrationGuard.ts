import * as THREE from "three";
import { setBox3FromObjectExcludingLayoutProxy } from "../box/boxAabbUtils";
import { computeBoxInteriorWorldBox } from "../constraints/finishCollision";

const MIN_INTERIOR_PENETRATION_M = 0.002;

const _movingBox = new THREE.Box3();
const _innerBox = new THREE.Box3();

/** True se, após aplicar delta, o mesh penetrar o volume interior estrutural da caixa. */
export function snapDeltaPenetratesBoxInterior(params: {
  mesh: THREE.Object3D;
  delta: THREE.Vector3;
  boxMesh: THREE.Object3D;
  widthM: number;
  heightM: number;
  depthM: number;
}): boolean {
  const { mesh, delta, boxMesh, widthM, heightM, depthM } = params;
  const saved = mesh.position.clone();
  mesh.position.add(delta);
  mesh.updateMatrixWorld(true);
  setBox3FromObjectExcludingLayoutProxy(_movingBox, mesh);
  _innerBox.copy(computeBoxInteriorWorldBox(boxMesh, widthM, heightM, depthM));
  const penetrates = boxesPenetrateInterior(_movingBox, _innerBox);
  mesh.position.copy(saved);
  return penetrates;
}

function boxesPenetrateInterior(moving: THREE.Box3, inner: THREE.Box3): boolean {
  if (!moving.intersectsBox(inner)) return false;
  const overlapX = Math.min(moving.max.x, inner.max.x) - Math.max(moving.min.x, inner.min.x);
  const overlapY = Math.min(moving.max.y, inner.max.y) - Math.max(moving.min.y, inner.min.y);
  const overlapZ = Math.min(moving.max.z, inner.max.z) - Math.max(moving.min.z, inner.min.z);
  return (
    overlapX > MIN_INTERIOR_PENETRATION_M &&
    overlapY > MIN_INTERIOR_PENETRATION_M &&
    overlapZ > MIN_INTERIOR_PENETRATION_M
  );
}
