import * as THREE from "three";

type OutlineEntry = {
  sourceMesh: THREE.Mesh;
  lines: THREE.LineSegments;
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

function isWoodPieceMesh(mesh: THREE.Mesh): boolean {
  const ud = (mesh as THREE.Mesh & { userData?: Record<string, unknown> }).userData ?? {};
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

function createBoxEdgesGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry | null {
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }
  const bb = geometry.boundingBox;
  if (!bb) return null;

  const min = bb.min;
  const max = bb.max;

  const corners = [
    [min.x, min.y, min.z],
    [max.x, min.y, min.z],
    [max.x, max.y, min.z],
    [min.x, max.y, min.z],
    [min.x, min.y, max.z],
    [max.x, min.y, max.z],
    [max.x, max.y, max.z],
    [min.x, max.y, max.z],
  ];

  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  const vertices: number[] = [];
  edges.forEach(([a, b]) => {
    const c1 = corners[a];
    const c2 = corners[b];
    vertices.push(c1[0], c1[1], c1[2], c2[0], c2[1], c2[2]);
  });

  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices), 3));
  lineGeometry.computeBoundingSphere();
  return lineGeometry;
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
      if (!(node.geometry instanceof THREE.BufferGeometry)) return;
      if (!isWoodPieceMesh(node)) return;

      const key = node.uuid;
      seen.add(key);
      const existing = this.entries.get(key);

      const geometryUuid = node.geometry.uuid;
      if (existing && existing.geometryUuid === geometryUuid) {
        return;
      }

      if (existing) {
        this.overlayGroup.remove(existing.lines);
        existing.lines.geometry.dispose();
        this.entries.delete(key);
      }

      const lineGeometry = createBoxEdgesGeometry(node.geometry);
      if (!lineGeometry) return;

      const lines = new THREE.LineSegments(lineGeometry, this.material);
      lines.name = `edge-outline-${node.name || node.uuid}`;
      lines.userData.isEdgeOutlineOverlay = true;
      lines.raycast = () => null;
      lines.frustumCulled = false;
      lines.matrixAutoUpdate = false;
      lines.renderOrder = 2001;

      this.overlayGroup.add(lines);
      this.entries.set(key, {
        sourceMesh: node,
        lines,
        geometryUuid,
      });
    });

    this.entries.forEach((entry, key) => {
      if (seen.has(key) && entry.sourceMesh.parent) return;
      this.overlayGroup.remove(entry.lines);
      entry.lines.geometry.dispose();
      this.entries.delete(key);
    });
  }

  update(): void {
    this.entries.forEach((entry) => {
      entry.sourceMesh.updateWorldMatrix(true, false);
      entry.lines.matrix.copy(entry.sourceMesh.matrixWorld);
      entry.lines.visible = hasVisibleAncestors(entry.sourceMesh);
    });
  }

  dispose(): void {
    this.entries.forEach((entry) => {
      this.overlayGroup.remove(entry.lines);
      entry.lines.geometry.dispose();
    });
    this.entries.clear();
    this.material.dispose();
    this.scene.remove(this.overlayGroup);
  }
}
