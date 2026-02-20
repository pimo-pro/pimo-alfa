import * as THREE from "three";

type SnapUserData = {
  currentWallId: number | null;
  lastWallId: number | null;
};

function getWallNormal(wall: THREE.Mesh): THREE.Vector3 {
  const raw = wall.userData?.wallNormal;
  if (raw instanceof THREE.Vector3) return raw.clone().normalize();
  return new THREE.Vector3(0, 0, 1).applyQuaternion(wall.quaternion).normalize();
}

function getWallId(wall: THREE.Mesh): number | null {
  const id = wall.userData?.wallId;
  return typeof id === "number" ? id : null;
}

function getWallLengthMeters(wall: THREE.Mesh): number {
  const mm = wall.userData?.wallLengthMm;
  if (typeof mm === "number" && Number.isFinite(mm)) return Math.max(0.01, mm * 0.001);
  const geom = wall.geometry as THREE.BufferGeometry & {
    parameters?: { width?: number };
  };
  return Math.max(0.01, Number(geom.parameters?.width) || 1);
}

function getSignedDistanceToWall(modelCenter: THREE.Vector3, wall: THREE.Mesh): {
  normal: THREE.Vector3;
  signedDistance: number;
} {
  const wallPoint = new THREE.Vector3();
  wall.getWorldPosition(wallPoint);
  const normal = getWallNormal(wall);
  const signedDistance = normal.dot(modelCenter.clone().sub(wallPoint));
  return { normal, signedDistance };
}

function applySnapPosition(
  model: THREE.Object3D,
  wall: THREE.Mesh,
  normal: THREE.Vector3,
  signedDistance: number
): void {
  model.updateMatrixWorld(true);
  const size = new THREE.Vector3();
  const modelBox = new THREE.Box3().setFromObject(model);
  modelBox.getSize(size);
  const halfDepth = Math.max(size.x, size.z) * 0.5;
  const wallThickness = Number(wall.userData?.wallThicknessM) || 0.12;
  const clearance = 0.01;

  const direction = Math.sign(signedDistance || 1);
  const targetSignedDistance = direction * (halfDepth + wallThickness * 0.5 + clearance);
  const delta = targetSignedDistance - signedDistance;
  model.position.addScaledVector(normal, delta);
}

export function isInsideWallRange(
  model: THREE.Object3D,
  wall: THREE.Mesh,
  margin = 0.25
): boolean {
  const modelCenter = new THREE.Vector3();
  model.getWorldPosition(modelCenter);
  const local = wall.worldToLocal(modelCenter.clone());
  const halfLength = getWallLengthMeters(wall) * 0.5;
  return local.x >= -halfLength - margin && local.x <= halfLength + margin;
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

  const snapData = (model.userData as Record<string, unknown>);
  if (!("currentWallId" in snapData)) snapData.currentWallId = null;
  if (!("lastWallId" in snapData)) snapData.lastWallId = null;
  const wallState = snapData as unknown as SnapUserData;

  const modelCenter = new THREE.Vector3();
  model.getWorldPosition(modelCenter);

  let nearest: { wall: THREE.Mesh; normal: THREE.Vector3; signedDistance: number } | null = null;

  for (const wall of wallsMain) {
    const { normal, signedDistance } = getSignedDistanceToWall(modelCenter, wall);
    const absDistance = Math.abs(signedDistance);

    if (!nearest || absDistance < Math.abs(nearest.signedDistance)) {
      nearest = { wall, normal, signedDistance };
    }
  }

  if (!nearest || Math.abs(nearest.signedDistance) > distanceThreshold) {
    return false;
  }

  const currentWall =
    wallState.currentWallId == null
      ? null
      : wallsMain.find((w) => getWallId(w) === wallState.currentWallId) ?? null;

  // Se ainda está no range da parede atual, mantém orientação atual
  // e só permite snap de posição nessa mesma parede.
  if (currentWall && isInsideWallRange(model, currentWall, 0.25)) {
    const current = getSignedDistanceToWall(modelCenter, currentWall);
    applySnapPosition(model, currentWall, current.normal, current.signedDistance);
    return true;
  }

  const currentDist =
    currentWall == null
      ? Number.POSITIVE_INFINITY
      : Math.abs(getSignedDistanceToWall(modelCenter, currentWall).signedDistance);
  const nearestId = getWallId(nearest.wall);
  const currentId = wallState.currentWallId;

  const canSwitchWall =
    nearestId != null &&
    nearestId !== currentId &&
    Math.abs(nearest.signedDistance) < distanceThreshold &&
    currentDist > distanceThreshold;

  if (canSwitchWall) {
    wallState.lastWallId = currentId;
    wallState.currentWallId = nearestId;
    model.rotation.y = nearest.wall.rotation.y;
    applySnapPosition(model, nearest.wall, nearest.normal, nearest.signedDistance);
    return true;
  }

  // Primeiro encaixe (quando ainda não tinha parede atual válida).
  if (currentWall == null && nearestId != null) {
    wallState.currentWallId = nearestId;
    model.rotation.y = nearest.wall.rotation.y;
    applySnapPosition(model, nearest.wall, nearest.normal, nearest.signedDistance);
    return true;
  }

  // Sem troca válida: mantém orientação e parede atual quando existir.
  if (currentWall) {
    const current = getSignedDistanceToWall(modelCenter, currentWall);
    applySnapPosition(model, currentWall, current.normal, current.signedDistance);
    return true;
  }

  applySnapPosition(model, nearest.wall, nearest.normal, nearest.signedDistance);
  return true;
}

