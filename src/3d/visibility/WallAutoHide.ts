import * as THREE from "three";

type WallMesh = THREE.Mesh & {
  userData?: {
    isMainWall?: boolean;
    isRoomWall?: boolean;
  };
};

function setMeshDepthWrite(mesh: THREE.Mesh, depthWrite: boolean): void {
  const material = mesh.material;
  if (Array.isArray(material)) {
    material.forEach((m) => {
      m.depthWrite = depthWrite;
      m.needsUpdate = true;
    });
    return;
  }
  material.depthWrite = depthWrite;
  material.needsUpdate = true;
}

function getWallNormal(mesh: WallMesh): THREE.Vector3 {
  const raw = mesh.userData?.wallNormal;
  if (raw instanceof THREE.Vector3) return raw.clone().normalize();
  return new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.quaternion).normalize();
}

/**
 * Camera-based wall culling:
 * - dot(normal, camera->wallCenter) < 0 => camera "atrás" da parede => oculta
 * - dot >= 0 => mostra
 */
export function updateWallVisibility(
  camera: THREE.Camera,
  wallsMain: THREE.Mesh[],
  wallsExtra: THREE.Mesh[] = []
): void {
  const epsilon = 0.02;

  wallsMain.forEach((wall) => {
    const m = wall as WallMesh;
    const center = new THREE.Vector3();
    m.getWorldPosition(center);

    const cameraToWall = center.sub(camera.position);
    if (cameraToWall.lengthSq() < 1e-8) {
      m.visible = true;
      setMeshDepthWrite(m, true);
      return;
    }

    cameraToWall.normalize();
    const normal = getWallNormal(m);
    const dot = normal.dot(cameraToWall);
    const visible = dot >= -epsilon;

    m.visible = visible;
    setMeshDepthWrite(m, visible);
  });

  // Opcional para extras: segue mesma regra, mas mantendo simples.
  wallsExtra.forEach((wall) => {
    const m = wall as WallMesh;
    const center = new THREE.Vector3();
    m.getWorldPosition(center);
    const cameraToWall = center.sub(camera.position);
    if (cameraToWall.lengthSq() < 1e-8) {
      m.visible = true;
      return;
    }
    cameraToWall.normalize();
    const normal = getWallNormal(m);
    m.visible = normal.dot(cameraToWall) >= -epsilon;
  });
}

