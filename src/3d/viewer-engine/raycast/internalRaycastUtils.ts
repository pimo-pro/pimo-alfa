import * as THREE from "three";

const edgesCache = new Map<string, Array<{ a: THREE.Vector3; b: THREE.Vector3 }>>();

/** Segmentos de aresta locais (espaço do mesh) a partir de EdgesGeometry. */
export function getMeshEdgeSegmentsLocal(geometry: THREE.BufferGeometry): Array<{ a: THREE.Vector3; b: THREE.Vector3 }> {
  const key = geometry.uuid;
  const cached = edgesCache.get(key);
  if (cached) return cached;

  const edges = new THREE.EdgesGeometry(geometry, 1);
  const attr = edges.getAttribute("position");
  const out: Array<{ a: THREE.Vector3; b: THREE.Vector3 }> = [];
  if (attr instanceof THREE.BufferAttribute) {
    for (let i = 0; i < attr.count - 1; i += 2) {
      out.push({
        a: new THREE.Vector3().fromBufferAttribute(attr, i),
        b: new THREE.Vector3().fromBufferAttribute(attr, i + 1),
      });
    }
  }
  edges.dispose();
  edgesCache.set(key, out);
  return out;
}

export function clearInternalRaycastEdgesCache(): void {
  edgesCache.clear();
}

export function getMeshFromRaycastObject(object: THREE.Object3D): THREE.Mesh | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current instanceof THREE.Mesh && current.geometry instanceof THREE.BufferGeometry) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

export function vec3ToPoint(v: THREE.Vector3): { x: number; y: number; z: number } {
  return { x: v.x, y: v.y, z: v.z };
}

export function roundPointIdCoord(v: number): number {
  return Math.round(v * 100000) / 100000;
}
