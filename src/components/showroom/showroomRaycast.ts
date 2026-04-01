import * as THREE from "three";

/** Interseção do raio (ecrã → mundo) com o plano horizontal Y = planeY. */
export function intersectRayWithHorizontalPlane(
  clientX: number,
  clientY: number,
  camera: THREE.Camera,
  domElement: HTMLElement,
  planeY = 0
): THREE.Vector3 | null {
  const rect = domElement.getBoundingClientRect();
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
  const out = new THREE.Vector3();
  const hit = raycaster.ray.intersectPlane(plane, out);
  return hit !== null ? out : null;
}
