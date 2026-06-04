import * as THREE from "three";
import type { RematePieceRotation } from "./rematePieceTypes";

const QUARTER = Math.PI / 2;

export function quantizeRad90(rad: number): number {
  return Math.round(rad / QUARTER) * QUARTER;
}

export function quantizeRemateRotationLocal(rotation: RematePieceRotation): RematePieceRotation {
  return {
    xRad: quantizeRad90(rotation.xRad),
    yRad: quantizeRad90(rotation.yRad),
    zRad: quantizeRad90(rotation.zRad),
  };
}

export function rotationSnapIndexFromLocalY(yRad: number): 0 | 1 | 2 | 3 {
  const idx = Math.round(yRad / QUARTER) % 4;
  return ((idx + 4) % 4) as 0 | 1 | 2 | 3;
}

/** Quantiza rotação do mesh remate; com box pai converte local↔world. */
export function applyRemateRotationSnapToMesh(
  mesh: THREE.Mesh,
  boxMesh: THREE.Object3D | null
): { rotation: RematePieceRotation; rotationSnapIndex: 0 | 1 | 2 | 3 } {
  if (boxMesh) {
    boxMesh.updateMatrixWorld(true);
    const invBoxQuat = new THREE.Quaternion().setFromRotationMatrix(boxMesh.matrixWorld).invert();
    const localQuat = mesh.quaternion.clone().premultiply(invBoxQuat);
    const euler = new THREE.Euler().setFromQuaternion(localQuat);
    const snapped = quantizeRemateRotationLocal({
      xRad: euler.x,
      yRad: euler.y,
      zRad: euler.z,
    });
    const snappedQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(snapped.xRad, snapped.yRad, snapped.zRad)
    );
    const boxQuat = new THREE.Quaternion().setFromRotationMatrix(boxMesh.matrixWorld);
    mesh.quaternion.copy(boxQuat).multiply(snappedQuat);
    return { rotation: snapped, rotationSnapIndex: rotationSnapIndexFromLocalY(snapped.yRad) };
  }

  const snapped = quantizeRemateRotationLocal({
    xRad: mesh.rotation.x,
    yRad: mesh.rotation.y,
    zRad: mesh.rotation.z,
  });
  mesh.rotation.set(snapped.xRad, snapped.yRad, snapped.zRad);
  return { rotation: snapped, rotationSnapIndex: rotationSnapIndexFromLocalY(snapped.yRad) };
}
