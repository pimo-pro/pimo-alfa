import * as THREE from "three";

function getWallNormal(wall: THREE.Mesh): THREE.Vector3 {
  const raw = wall.userData?.wallNormal;
  if (raw instanceof THREE.Vector3) return raw.clone().normalize();
  return new THREE.Vector3(0, 0, 1).applyQuaternion(wall.quaternion).normalize();
}

/**
 * Encaixa o modelo na parede principal mais próxima e alinha rotação.
 * Retorna true quando o snap foi aplicado.
 */
export function snapModelToNearestWall(
  model: THREE.Object3D,
  wallsMain: THREE.Mesh[],
  distanceThreshold = 0.4
): boolean {
  if (!wallsMain.length) return false;

  const modelCenter = new THREE.Vector3();
  model.getWorldPosition(modelCenter);

  let nearest: { wall: THREE.Mesh; normal: THREE.Vector3; signedDistance: number } | null = null;

  for (const wall of wallsMain) {
    const wallPoint = new THREE.Vector3();
    wall.getWorldPosition(wallPoint);
    const normal = getWallNormal(wall);
    const signedDistance = normal.dot(modelCenter.clone().sub(wallPoint));
    const absDistance = Math.abs(signedDistance);

    if (!nearest || absDistance < Math.abs(nearest.signedDistance)) {
      nearest = { wall, normal, signedDistance };
    }
  }

  if (!nearest || Math.abs(nearest.signedDistance) > distanceThreshold) {
    return false;
  }

  // Auto-rotação conforme parede alvo.
  model.rotation.y = nearest.wall.rotation.y;
  model.updateMatrixWorld(true);

  const size = new THREE.Vector3();
  const modelBox = new THREE.Box3().setFromObject(model);
  modelBox.getSize(size);
  const halfDepth = Math.max(size.x, size.z) * 0.5;
  const wallThickness = Number(nearest.wall.userData?.wallThicknessM) || 0.12;
  const clearance = 0.01;

  const direction = Math.sign(nearest.signedDistance || 1);
  const targetSignedDistance = direction * (halfDepth + wallThickness * 0.5 + clearance);
  const delta = targetSignedDistance - nearest.signedDistance;

  model.position.addScaledVector(nearest.normal, delta);
  return true;
}

