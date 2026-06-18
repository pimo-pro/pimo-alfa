import * as THREE from "three";

export type MultiOutlineTarget = {
  mesh: THREE.Object3D;
  layoutDims?: { w: number; h: number; d: number };
};

export type MultiOutlineResolveFn = (encodedId: string) => MultiOutlineTarget | null;

type OutlineEntry = {
  wireframe: THREE.LineSegments;
  target: THREE.Object3D;
  useLayoutBox: boolean;
  layoutDims?: { w: number; h: number; d: number };
};

/**
 * Contornos para todos os itens em `selectedObjects` (multi-seleção).
 */
export class MultiSelectionOutline {
  private readonly group: THREE.Group;
  private readonly material: THREE.LineBasicMaterial;
  private entries = new Map<string, OutlineEntry>();

  constructor(scene: THREE.Scene) {
    this.material = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.72,
      depthTest: true,
    });
    this.group = new THREE.Group();
    this.group.name = "multiSelectionOutline";
    this.group.visible = false;
    scene.add(this.group);
  }

  sync(encodedIds: string[], resolve: MultiOutlineResolveFn): void {
    const next = new Set(encodedIds.filter(Boolean));
    for (const id of this.entries.keys()) {
      if (!next.has(id)) this.removeEntry(id);
    }
    for (const encoded of next) {
      if (!this.entries.has(encoded)) {
        const target = resolve(encoded);
        if (target) this.addEntry(encoded, target);
      }
    }
    this.group.visible = this.entries.size > 0;
    this.updateMatrices();
  }

  updateMatrices(): void {
    for (const entry of this.entries.values()) {
      entry.target.updateMatrixWorld(true);
      entry.wireframe.visible = this.isVisibleChain(entry.target);
      entry.wireframe.matrix.copy(entry.target.matrixWorld);
    }
  }

  dispose(scene: THREE.Scene): void {
    for (const id of [...this.entries.keys()]) this.removeEntry(id);
    scene.remove(this.group);
    this.material.dispose();
  }

  private isVisibleChain(node: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = node;
    while (current) {
      if (!current.visible) return false;
      current = current.parent;
    }
    return true;
  }

  private addEntry(encoded: string, target: MultiOutlineTarget): void {
    const useLayoutBox = Boolean(target.layoutDims);
    let wireframe: THREE.LineSegments;

    if (useLayoutBox && target.layoutDims) {
      const { w, h, d } = target.layoutDims;
      const boxGeo = new THREE.BoxGeometry(Math.max(0.001, w), Math.max(0.001, h), Math.max(0.001, d));
      const edges = new THREE.EdgesGeometry(boxGeo);
      boxGeo.dispose();
      wireframe = new THREE.LineSegments(edges, this.material);
    } else if (target.mesh instanceof THREE.Mesh && target.mesh.geometry) {
      const edges = new THREE.EdgesGeometry(target.mesh.geometry);
      wireframe = new THREE.LineSegments(edges, this.material);
    } else {
      const boxGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
      const edges = new THREE.EdgesGeometry(boxGeo);
      boxGeo.dispose();
      wireframe = new THREE.LineSegments(edges, this.material);
    }

    wireframe.name = `multi-outline-${encoded}`;
    wireframe.raycast = () => null;
    wireframe.matrixAutoUpdate = false;
    wireframe.frustumCulled = false;
    wireframe.renderOrder = 2000;
    this.group.add(wireframe);
    this.entries.set(encoded, {
      wireframe,
      target: target.mesh,
      useLayoutBox,
      layoutDims: target.layoutDims,
    });
  }

  private removeEntry(encoded: string): void {
    const entry = this.entries.get(encoded);
    if (!entry) return;
    this.group.remove(entry.wireframe);
    entry.wireframe.geometry.dispose();
    this.entries.delete(encoded);
  }
}
