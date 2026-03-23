/**
 * Silhuetas tipo desenho técnico: apenas arestas da caixa envolvente de cada módulo (sem geometria interna).
 */
import * as THREE from "three";

const LINE_COLOR = 0x1a1a1a;
const MIN_EDGE = 0.0005;

export function createCabinetSilhouetteLines(mesh: THREE.Object3D): THREE.LineSegments | null {
  const box3 = new THREE.Box3().setFromObject(mesh);
  if (box3.isEmpty()) return null;
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box3.getSize(size);
  box3.getCenter(center);
  const gw = Math.max(size.x, MIN_EDGE);
  const gh = Math.max(size.y, MIN_EDGE);
  const gd = Math.max(size.z, MIN_EDGE);
  const boxGeom = new THREE.BoxGeometry(gw, gh, gd);
  const edges = new THREE.EdgesGeometry(boxGeom);
  boxGeom.dispose();
  const mat = new THREE.LineBasicMaterial({ color: LINE_COLOR });
  const lines = new THREE.LineSegments(edges, mat);
  lines.position.copy(center);
  lines.frustumCulled = false;
  return lines;
}

export function disposeSilhouetteObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.LineSegments) {
      child.geometry?.dispose();
      const m = child.material;
      if (Array.isArray(m)) m.forEach((matItem) => matItem.dispose());
      else if (m) (m as THREE.Material).dispose();
    }
  });
}
