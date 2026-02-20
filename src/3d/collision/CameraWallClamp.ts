import * as THREE from "three";
import type { RoomBounds } from "../room/RoomManager";

/**
 * Soft clamp da câmera contra paredes principais e limites internos da sala.
 * Não afeta paredes extras nem modelos.
 */
export function clampCameraToRoom(
  camera: THREE.Camera,
  roomBounds: RoomBounds,
  wallsMain: THREE.Mesh[],
  margin = 0.25
): void {
  const radius = Math.max(0.05, margin);
  const cameraPos = camera.position;
  const box = new THREE.Box3();
  const expanded = new THREE.Box3();
  const closestPoint = new THREE.Vector3();
  const push = new THREE.Vector3();
  const boxCenter = new THREE.Vector3();

  for (const wall of wallsMain) {
    wall.updateMatrixWorld(true);
    box.setFromObject(wall);
    expanded.copy(box).expandByScalar(radius);

    if (!expanded.containsPoint(cameraPos)) continue;

    expanded.clampPoint(cameraPos.clone(), closestPoint);
    push.copy(cameraPos).sub(closestPoint);

    // Se clampPoint retornar o próprio ponto (situação no interior do box),
    // calcula empurrão suave para fora baseado no centro do volume.
    if (push.lengthSq() < 1e-10) {
      expanded.getCenter(boxCenter);
      push.copy(cameraPos).sub(boxCenter);
      if (push.lengthSq() < 1e-10) {
        const normal = wall.userData?.wallNormal;
        if (normal instanceof THREE.Vector3) {
          push.copy(normal);
        } else {
          push.set(0, 0, 1);
        }
      }
    }

    const dist = push.length();
    if (dist < radius) {
      push.normalize().multiplyScalar(radius - dist);
      cameraPos.add(push);
    }
  }

  if (cameraPos.x < roomBounds.minX + radius) cameraPos.x = roomBounds.minX + radius;
  if (cameraPos.x > roomBounds.maxX - radius) cameraPos.x = roomBounds.maxX - radius;
  if (cameraPos.z < roomBounds.minZ + radius) cameraPos.z = roomBounds.minZ + radius;
  if (cameraPos.z > roomBounds.maxZ - radius) cameraPos.z = roomBounds.maxZ - radius;

  if (cameraPos.y < 0.3) cameraPos.y = 0.3;
}

