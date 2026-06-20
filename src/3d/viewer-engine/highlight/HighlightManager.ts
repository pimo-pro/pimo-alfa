/**
 * Gestao de selecao/hover de meshes selecionaveis no Viewer 3D.
 * O desenho de outline e feito por overlay pos-render no modulo de outline.
 */

import * as THREE from "three";
import { isDrawerClickTarget } from "../../../core/drawers/drawerMeshIdentity";

function isSelectable(node: THREE.Object3D): boolean {
  const ud = (node as THREE.Object3D & { userData?: Record<string, unknown> }).userData;
  if (!ud) return false;
  if (isDrawerClickTarget(node)) return false;
  if (ud.drawerId != null || ud.drawerLayerId != null || ud.drawerPart != null) return false;
  if (ud.selectable === true) return true;
  if (ud.panelType != null) return true;
  if (ud.doorLayerId != null) return true;
  if (ud.isDrillMarker === true) return false;
  if (ud.isDrillHole === true) return false;
  if (ud.doorHolesEffective != null) return true;
  if (ud.isRoomElement === true) return true;
  const name = (node as { name?: string }).name;
  if (
    typeof name === "string" &&
    (name.startsWith("shelf-") || name.startsWith("door-leaf-"))
  ) {
    return true;
  }
  return false;
}

export class HighlightManager {
  private enabled = false;
  private hoveredMesh: THREE.Mesh | null = null;
  private selectedMesh: THREE.Mesh | null = null;
  private readonly originalByMesh = new WeakMap<
    THREE.Mesh,
    Array<{ color: THREE.Color | null; intensity: number | null }>
  >();

  constructor(scene: THREE.Scene) {
    void scene;
  }

  private readMaterialEntries(mesh: THREE.Mesh): Array<{ emissive?: THREE.Color; emissiveIntensity?: number }> {
    const raw = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    return raw.filter(Boolean) as Array<{ emissive?: THREE.Color; emissiveIntensity?: number }>;
  }

  private saveOriginal(mesh: THREE.Mesh): void {
    if (this.originalByMesh.has(mesh)) return;
    const snapshot = this.readMaterialEntries(mesh).map((m) => ({
      color: m.emissive ? m.emissive.clone() : null,
      intensity: typeof m.emissiveIntensity === "number" ? m.emissiveIntensity : null,
    }));
    this.originalByMesh.set(mesh, snapshot);
  }

  private restoreOriginal(mesh: THREE.Mesh | null): void {
    if (!mesh) return;
    const original = this.originalByMesh.get(mesh);
    if (!original) return;
    const materials = this.readMaterialEntries(mesh);
    materials.forEach((m, idx) => {
      const source = original[idx];
      if (!source) return;
      if (m.emissive && source.color) m.emissive.copy(source.color);
      if (typeof source.intensity === "number") m.emissiveIntensity = source.intensity;
    });
  }

  private applyVisual(mesh: THREE.Mesh | null, style: "hover" | "selected"): void {
    if (!mesh) return;
    this.saveOriginal(mesh);
    const intensity = style === "selected" ? 0.55 : 0.3;
    const boost = style === "selected" ? 0.22 : 0.12;
    this.readMaterialEntries(mesh).forEach((m) => {
      if (!m.emissive) return;
      m.emissive.lerp(new THREE.Color("#93c5fd"), boost);
      m.emissiveIntensity = Math.max(m.emissiveIntensity ?? 0, intensity);
    });
  }

  private refreshVisualState(): void {
    this.restoreOriginal(this.hoveredMesh);
    this.restoreOriginal(this.selectedMesh);
    if (!this.enabled) return;
    this.applyVisual(this.hoveredMesh, "hover");
    this.applyVisual(this.selectedMesh, "selected");
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) {
      this.restoreOriginal(this.hoveredMesh);
      this.restoreOriginal(this.selectedMesh);
      this.hoveredMesh = null;
      this.selectedMesh = null;
      return;
    }
    this.refreshVisualState();
  }

  getEnabled(): boolean {
    return this.enabled;
  }

  getSelectedMesh(): THREE.Mesh | null {
    return this.selectedMesh;
  }

  clearAll(): void {
    this.restoreOriginal(this.hoveredMesh);
    this.restoreOriginal(this.selectedMesh);
    this.hoveredMesh = null;
    this.selectedMesh = null;
  }

  setHovered(mesh: THREE.Mesh | null): void {
    if (this.hoveredMesh === mesh) return;
    this.hoveredMesh = mesh;
    this.refreshVisualState();
  }

  setSelected(mesh: THREE.Mesh | null): void {
    if (this.selectedMesh === mesh) return;
    this.selectedMesh = mesh;
    this.refreshVisualState();
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
