import * as THREE from "three";

type OutlineEntry = {
  sourceMesh: THREE.Mesh;
  /** Um `BoxHelper` por mesh (ligado ao `sourceMesh` via `.object`). */
  lines: THREE.BoxHelper;
  geometryUuid: string;
};

function hasVisibleAncestors(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

/** Mesma regra que o contorno fino global: painéis, portas, gavetas, prateleiras; exclui proxy e overlays. */
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

/** Peças de madeira + malhas de furo CNC (`isDrillHole`) com `boxId`. */
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

function disposeBoxHelperGeometryOnly(helper: THREE.BoxHelper): void {
  helper.geometry.dispose();
}

export class EdgeOutlineSystem {
  private readonly scene: THREE.Scene;
  private readonly overlayGroup = new THREE.Group();
  private readonly material: THREE.LineBasicMaterial;
  private readonly entries = new Map<string, OutlineEntry>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
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

  syncRoot(root: THREE.Object3D): void {
    const seen = new Set<string>();

    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      if (!isEdgeOutlineMesh(node)) return;

      const key = node.uuid;
      seen.add(key);
      const existing = this.entries.get(key);

      const geometryUuid = node.geometry.uuid;
      if (existing && existing.geometryUuid === geometryUuid) {
        return;
      }

      if (existing) {
        this.overlayGroup.remove(existing.lines);
        disposeBoxHelperGeometryOnly(existing.lines);
        this.entries.delete(key);
      }

      const helper = new THREE.BoxHelper(node, 0x000000);
      (helper.material as THREE.Material).dispose();
      helper.material = this.material;
      helper.name = `edge-outline-${node.name || node.uuid}`;
      helper.userData.isEdgeOutlineOverlay = true;
      helper.raycast = () => null;
      helper.frustumCulled = false;
      helper.renderOrder = 2001;

      this.overlayGroup.add(helper);
      helper.update();

      this.entries.set(key, {
        sourceMesh: node,
        lines: helper,
        geometryUuid,
      });
    });

    this.entries.forEach((entry, key) => {
      if (seen.has(key) && entry.sourceMesh.parent) return;
      this.overlayGroup.remove(entry.lines);
      disposeBoxHelperGeometryOnly(entry.lines);
      this.entries.delete(key);
    });
  }

  update(): void {
    this.entries.forEach((entry) => {
      entry.sourceMesh.updateWorldMatrix(true, false);
      const show = hasVisibleAncestors(entry.sourceMesh);
      entry.lines.visible = show;
      if (show) {
        entry.lines.update();
      }
    });
  }

  dispose(): void {
    this.entries.forEach((entry) => {
      this.overlayGroup.remove(entry.lines);
      disposeBoxHelperGeometryOnly(entry.lines);
    });
    this.entries.clear();
    this.material.dispose();
    this.scene.remove(this.overlayGroup);
  }
}
