import * as THREE from "three";

export type ScreenRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function rectsIntersect(a: ScreenRect, b: ScreenRect): boolean {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

/** Projeta um Object3D para retângulo em coordenadas client (px). */
export function projectObjectToScreenRect(
  object: THREE.Object3D,
  camera: THREE.Camera,
  canvasRect: DOMRect
): ScreenRect | null {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return null;

  const corners = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const projected = new THREE.Vector3();

  for (const corner of corners) {
    projected.copy(corner).project(camera);
    const x = ((projected.x + 1) / 2) * canvasRect.width + canvasRect.left;
    const y = ((-projected.y + 1) / 2) * canvasRect.height + canvasRect.top;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (!Number.isFinite(minX)) return null;
  return { left: minX, top: minY, right: maxX, bottom: maxY };
}

export function isObjectInScreenRect(
  object: THREE.Object3D,
  selectionRect: ScreenRect,
  camera: THREE.Camera,
  canvasRect: DOMRect
): boolean {
  const projected = projectObjectToScreenRect(object, camera, canvasRect);
  if (!projected) return false;
  return rectsIntersect(projected, selectionRect);
}
