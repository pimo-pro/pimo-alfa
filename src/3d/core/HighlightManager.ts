/**
 * Gestão de highlight no Viewer 3D: hover (outline + tint) e seleção (permanente).
 * Qualquer mesh com userData.selectable = true ou panelType/doorLayerId/drawerPart é selecionável.
 * Outline: EdgesGeometry + LineSegments. Tint: overlay com MeshBasicMaterial azul sem alterar material original.
 */

import * as THREE from "three";

const HIGHLIGHT_COLOR = 0x4da3ff;
const HIGHLIGHT_TINT_OPACITY = 0.25;
const OUTLINE_OPACITY = 0.9;

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
  if (typeof name === "string" && (name.startsWith("shelf-") || name.startsWith("door-leaf-") || name.startsWith("drawer-")))
    return true;
  return false;
}


type OverlayEntry = {
  tintMesh: THREE.Mesh;
  outlineLines: THREE.LineSegments;
  sourceMesh: THREE.Mesh;
};

export class HighlightManager {
  private enabled = false;
  private selectedMesh: THREE.Mesh | null = null;
  private hoveredMesh: THREE.Mesh | null = null;
  private overlayGroup = new THREE.Group();
  private overlayMap = new Map<THREE.Mesh, OverlayEntry>();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.overlayGroup.name = "HighlightOverlayGroup";
    this.overlayGroup.renderOrder = 1000;
    this.scene.add(this.overlayGroup);
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) {
      this.clearAll();
      this.selectedMesh = null;
      this.hoveredMesh = null;
    }
  }

  getEnabled(): boolean {
    return this.enabled;
  }

  getSelectedMesh(): THREE.Mesh | null {
    return this.selectedMesh;
  }

  clearAll(): void {
    this.overlayMap.forEach((entry) => {
      this.overlayGroup.remove(entry.tintMesh);
      this.overlayGroup.remove(entry.outlineLines);
      entry.tintMesh.geometry.dispose();
      (entry.tintMesh.material as THREE.Material).dispose();
      entry.outlineLines.geometry.dispose();
      (entry.outlineLines.material as THREE.Material).dispose();
    });
    this.overlayMap.clear();
  }

  private ensureOverlay(mesh: THREE.Mesh): OverlayEntry {
    let entry = this.overlayMap.get(mesh);
    if (entry) return entry;

    const geom = mesh.geometry;
    const tintGeom = geom.clone();
    const tintMat = new THREE.MeshBasicMaterial({
      color: HIGHLIGHT_COLOR,
      transparent: true,
      opacity: HIGHLIGHT_TINT_OPACITY,
      depthWrite: false,
    });
    const tintMesh = new THREE.Mesh(tintGeom, tintMat);
    tintMesh.frustumCulled = false;
    tintMesh.renderOrder = 999;

    const edgesGeom = new THREE.EdgesGeometry(geom, 15);
    const outlineMat = new THREE.LineBasicMaterial({
      color: HIGHLIGHT_COLOR,
      linewidth: 2,
      transparent: true,
      opacity: OUTLINE_OPACITY,
    });
    const outlineLines = new THREE.LineSegments(edgesGeom, outlineMat);
    outlineLines.frustumCulled = false;
    outlineLines.renderOrder = 1001;

    this.overlayGroup.add(tintMesh);
    this.overlayGroup.add(outlineLines);
    entry = { tintMesh, outlineLines, sourceMesh: mesh };
    this.overlayMap.set(mesh, entry);
    return entry;
  }

  private removeOverlay(mesh: THREE.Mesh): void {
    const entry = this.overlayMap.get(mesh);
    if (!entry) return;
    this.overlayGroup.remove(entry.tintMesh);
    this.overlayGroup.remove(entry.outlineLines);
    entry.tintMesh.geometry.dispose();
    (entry.tintMesh.material as THREE.Material).dispose();
    entry.outlineLines.geometry.dispose();
    (entry.outlineLines.material as THREE.Material).dispose();
    this.overlayMap.delete(mesh);
  }

  setHovered(mesh: THREE.Mesh | null): void {
    if (this.hoveredMesh === mesh) return;
    if (this.hoveredMesh) this.removeOverlay(this.hoveredMesh);
    this.hoveredMesh = mesh;
    if (mesh) this.ensureOverlay(mesh);
  }

  setSelected(mesh: THREE.Mesh | null): void {
    if (this.selectedMesh === mesh) return;
    if (this.selectedMesh) this.removeOverlay(this.selectedMesh);
    this.selectedMesh = mesh;
    if (mesh) this.ensureOverlay(mesh);
  }

  /** Atualizar matrizes dos overlays a partir dos meshes fonte (chamar no render loop). */
  update(): void {
    if (!this.enabled) return;
    this.overlayMap.forEach((entry) => {
      entry.sourceMesh.updateWorldMatrix(true, false);
      entry.tintMesh.matrix.copy(entry.sourceMesh.matrixWorld);
      entry.tintMesh.matrixAutoUpdate = false;
      entry.outlineLines.matrix.copy(entry.sourceMesh.matrixWorld);
      entry.outlineLines.matrixAutoUpdate = false;
    });
  }

  /**
   * Encontra o primeiro mesh selecionável na interseção do raycaster (hit.object é o mesh).
   */
  getSelectableMeshFromIntersects(intersects: THREE.Intersection[]): THREE.Mesh | null {
    for (const hit of intersects) {
      if (hit.object instanceof THREE.Mesh && isSelectable(hit.object)) return hit.object;
    }
    return null;
  }

  dispose(): void {
    this.clearAll();
    this.scene.remove(this.overlayGroup);
    this.selectedMesh = null;
    this.hoveredMesh = null;
  }
}
