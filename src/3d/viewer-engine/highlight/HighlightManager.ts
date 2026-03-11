/**
 * Gestao de selecao/hover de meshes selecionaveis no Viewer 3D.
 * O desenho de outline e feito por overlay pos-render no modulo de outline.
 */

import * as THREE from "three";

function isSelectable(node: THREE.Object3D): boolean {
  const ud = (node as THREE.Object3D & { userData?: Record<string, unknown> }).userData;
  if (!ud) return false;
  if (ud.selectable === true) return true;
  if (ud.panelType != null) return true;
  if (ud.doorLayerId != null) return true;
  if (ud.drawerPart != null) return true;
  if (ud.isDrillMarker === true) return true;
  if (ud.doorHolesEffective != null) return true;
  if (ud.isRoomElement === true) return true;
  const name = (node as { name?: string }).name;
  if (
    typeof name === "string" &&
    (name.startsWith("shelf-") || name.startsWith("door-leaf-") || name.startsWith("drawer-"))
  ) {
    return true;
  }
  return false;
}

export class HighlightManager {
  private enabled = false;
  private selectedMesh: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene) {
    void scene;
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) {
      this.selectedMesh = null;
    }
  }

  getEnabled(): boolean {
    return this.enabled;
  }

  getSelectedMesh(): THREE.Mesh | null {
    return this.selectedMesh;
  }

  clearAll(): void {
    this.selectedMesh = null;
  }

  setHovered(mesh: THREE.Mesh | null): void {
    void mesh;
  }

  setSelected(mesh: THREE.Mesh | null): void {
    this.selectedMesh = mesh;
  }

  update(): void {
    // Sem overlays locais; estado e usado pelo sistema de outline pos-render.
  }

  getSelectableMeshFromIntersects(intersects: THREE.Intersection[]): THREE.Mesh | null {
    for (const hit of intersects) {
      if (hit.object instanceof THREE.Mesh && isSelectable(hit.object)) return hit.object;
    }
    return null;
  }

  dispose(): void {
    this.clearAll();
  }
}
