import * as THREE from "three";

export type EdgeOutlineBoxEntry = {
  mesh: THREE.Object3D;
  width: number;
  height: number;
  carcassDepth?: number;
  depth: number;
  cadOnly?: boolean;
};

type InternalEntry = {
  boxId: string;
  lines: THREE.LineSegments;
  sig: string;
  mesh: THREE.Object3D;
};

function hasVisibleAncestors(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

/** Mesma regra que o contorno fino global: painéis, portas, gavetas, prateleiras; exclui proxy e overlays. Mantido exportado para compatibilidade; o sync já não percorre meshes. */
export function isWoodPieceMesh(mesh: THREE.Mesh): boolean {
  const ud = (mesh as THREE.Mesh & { userData?: Record<string, unknown> }).userData ?? {};
  if (ud.viewerLayoutBounds === true) return false;
  if (ud.isDrillMarker === true) return false;
  if (ud.isDrillHole === true) return false;
  if (ud.isPanelEdgeOverlay === true) return false;
  if (ud.isEdgeOutlineOverlay === true) return false;
  if (ud.isRoomElement === true) return false;
  if (ud.isKitchenFeet === true) return false;
  if (typeof ud.boxId !== "string" || ud.boxId.trim().length === 0) return false;

  if (ud.panelType != null) return true;
  if (ud.doorLayerId != null) return true;
  if (ud.drawerPart != null) return true;

  const name = typeof mesh.name === "string" ? mesh.name : "";
  if (name.startsWith("shelf-")) return true;
  if (name.startsWith("door-leaf-")) return true;
  if (name.startsWith("drawer-")) return true;
  return false;
}

/** Peças de madeira + malhas de furo CNC (`isDrillHole`) com `boxId`. Mantido exportado para compatibilidade. */
export function isEdgeOutlineMesh(mesh: THREE.Mesh): boolean {
  if (!(mesh.geometry instanceof THREE.BufferGeometry)) return false;
  const ud = (mesh as THREE.Mesh & { userData?: Record<string, unknown> }).userData ?? {};
  if (ud.viewerLayoutBounds === true) return false;
  if (ud.isDrillMarker === true) return false;
  if (ud.isPanelEdgeOverlay === true) return false;
  if (ud.isEdgeOutlineOverlay === true) return false;
  if (ud.isRoomElement === true) return false;
  if (ud.isKitchenFeet === true) return false;
  if (typeof ud.boxId !== "string" || ud.boxId.trim().length === 0) return false;
  if (ud.isDrillHole === true) return true;
  return isWoodPieceMesh(mesh);
}

function disposeLineSegmentsGeometry(lines: THREE.LineSegments): void {
  lines.geometry.dispose();
}

export class EdgeOutlineSystem {
  private readonly scene: THREE.Scene;
  private readonly overlayGroup = new THREE.Group();
  private readonly material: THREE.LineBasicMaterial;
  private readonly entries = new Map<string, InternalEntry>();
  private readonly enabled: boolean;

  constructor(scene: THREE.Scene, enabled = true) {
    this.scene = scene;
    this.enabled = enabled;
    if (!enabled) {
      this.material = new THREE.LineBasicMaterial();
      return;
    }
    this.overlayGroup.name = "EdgeOutlineOverlayGroup";
    this.overlayGroup.renderOrder = 2000;
    this.scene.add(this.overlayGroup);

    this.material = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 1,
      transparent: false,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
  }

  syncRoot(_root: THREE.Object3D, boxes: ReadonlyMap<string, EdgeOutlineBoxEntry> | null): void {
    if (!this.enabled) return;
    if (!boxes) {
      this.clearAllEntries();
      return;
    }

    const seen = new Set<string>();

    boxes.forEach((entry, boxId) => {
      if (entry.cadOnly) return;

      seen.add(boxId);
      const sig = `${entry.width}:${entry.height}:${entry.carcassDepth ?? entry.depth}`;
      const existing = this.entries.get(boxId);

      if (existing && existing.sig === sig) {
        existing.mesh = entry.mesh;
        return;
      }

      if (existing) {
        this.overlayGroup.remove(existing.lines);
        disposeLineSegmentsGeometry(existing.lines);
        this.entries.delete(boxId);
      }

      const w = Math.max(0.001, entry.width);
      const h = Math.max(0.001, entry.height);
      const d = Math.max(0.001, entry.carcassDepth ?? entry.depth);
      const geo = new THREE.BoxGeometry(w, h, d);
      const edges = new THREE.EdgesGeometry(geo);
      geo.dispose();
      const lines = new THREE.LineSegments(edges, this.material);
      lines.name = `edge-outline-box-${boxId}`;
      lines.userData.isEdgeOutlineOverlay = true;
      lines.raycast = () => null;
      lines.frustumCulled = false;
      lines.renderOrder = 2001;
      lines.matrixAutoUpdate = false;
      this.overlayGroup.add(lines);

      this.entries.set(boxId, { boxId, lines, sig, mesh: entry.mesh });
    });

    const toRemove: string[] = [];
    this.entries.forEach((_, id) => {
      if (!seen.has(id)) toRemove.push(id);
    });
    toRemove.forEach((id) => {
      const internal = this.entries.get(id);
      if (!internal) return;
      this.overlayGroup.remove(internal.lines);
      disposeLineSegmentsGeometry(internal.lines);
      this.entries.delete(id);
    });
  }

  private clearAllEntries(): void {
    this.entries.forEach((internal) => {
      this.overlayGroup.remove(internal.lines);
      disposeLineSegmentsGeometry(internal.lines);
    });
    this.entries.clear();
  }

  update(): void {
    if (!this.enabled) return;
    this.entries.forEach((entry) => {
      entry.mesh.updateWorldMatrix(true, false);
      const show = hasVisibleAncestors(entry.mesh) && entry.mesh.visible;
      entry.lines.visible = show;
      if (show) {
        entry.lines.matrix.copy(entry.mesh.matrixWorld);
      }
    });
  }

  dispose(): void {
    this.clearAllEntries();
    this.material.dispose();
    this.scene.remove(this.overlayGroup);
  }
}
