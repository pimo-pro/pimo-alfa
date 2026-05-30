import * as THREE from "three";
import type { InternalSelectionState } from "./internalSelectionTypes";

const OUTLINE_COLOR = 0xfbbf24;
const POINT_SIZE_M = 0.012;

/**
 * Outline simples para seleção interna (face / aresta / ponto).
 * Separado do contorno externo de caixa (`selectionOutline`).
 */
export class InternalSelectionOutline {
  private readonly group: THREE.Group;
  private readonly material: THREE.LineBasicMaterial;
  private readonly pointMaterial: THREE.LineBasicMaterial;
  private content: THREE.Object3D | null = null;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.name = "internalSelectionOutline";
    this.group.visible = false;
    this.group.renderOrder = 2100;

    this.material = new THREE.LineBasicMaterial({
      color: OUTLINE_COLOR,
      linewidth: 1,
      opacity: 0.92,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.pointMaterial = new THREE.LineBasicMaterial({
      color: OUTLINE_COLOR,
      linewidth: 1,
      opacity: 1,
      transparent: false,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });

    scene.add(this.group);
  }

  sync(state: InternalSelectionState | null, getBoxMesh: (boxId: string) => THREE.Object3D | null): void {
    this.clearContent();
    if (!state) {
      this.group.visible = false;
      return;
    }

    if (state.type === "internal-edge" && state.worldEdgeStart && state.worldEdgeEnd) {
      this.content = this.buildEdgeLine(state.worldEdgeStart, state.worldEdgeEnd);
    } else if (state.type === "internal-point") {
      this.content = this.buildPointMarker(state.worldPoint);
    } else if (state.type === "internal-face") {
      this.content = this.buildFaceMarker(state, getBoxMesh);
    }

    if (this.content) {
      this.group.add(this.content);
      this.group.visible = true;
    } else {
      this.group.visible = false;
    }
  }

  private buildEdgeLine(
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number }
  ): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(start.x, start.y, start.z),
      new THREE.Vector3(end.x, end.y, end.z),
    ]);
    const line = new THREE.Line(geometry, this.material);
    line.userData.isInternalSelectionOutline = true;
    return line;
  }

  private buildPointMarker(point: { x: number; y: number; z: number }): THREE.LineSegments {
    const s = POINT_SIZE_M;
    const cx = point.x;
    const cy = point.y;
    const cz = point.z;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(cx - s, cy, cz),
      new THREE.Vector3(cx + s, cy, cz),
      new THREE.Vector3(cx, cy - s, cz),
      new THREE.Vector3(cx, cy + s, cz),
      new THREE.Vector3(cx, cy, cz - s),
      new THREE.Vector3(cx, cy, cz + s),
    ]);
    const lines = new THREE.LineSegments(geometry, this.pointMaterial);
    lines.userData.isInternalSelectionOutline = true;
    return lines;
  }

  private buildFaceMarker(
    state: InternalSelectionState,
    getBoxMesh: (boxId: string) => THREE.Object3D | null
  ): THREE.Object3D | null {
    const root = getBoxMesh(state.boxId);
    if (!root) {
      return this.buildPointMarker(state.worldPoint);
    }

    let targetMesh: THREE.Mesh | null = null;
    root.traverse((node) => {
      if (targetMesh) return;
      if (!(node instanceof THREE.Mesh)) return;
      const panelId = node.userData?.panelId;
      if (state.panelId && typeof panelId === "string" && panelId === state.panelId) {
        targetMesh = node;
      }
    });

    if (!targetMesh && state.panelId) {
      const panelType = state.panelId.split(":").pop();
      root.traverse((node) => {
        if (targetMesh) return;
        if (!(node instanceof THREE.Mesh)) return;
        if (node.userData?.panelType === panelType) targetMesh = node;
      });
    }

    if (targetMesh?.geometry instanceof THREE.BufferGeometry) {
      const edges = new THREE.EdgesGeometry(targetMesh.geometry, 1);
      const wireframe = new THREE.LineSegments(edges, this.material);
      targetMesh.updateMatrixWorld(true);
      wireframe.matrix.copy(targetMesh.matrixWorld);
      wireframe.matrixAutoUpdate = false;
      wireframe.userData.isInternalSelectionOutline = true;
      return wireframe;
    }

    return this.buildPointMarker(state.worldPoint);
  }

  private clearContent(): void {
    if (!this.content) return;
    this.group.remove(this.content);
    if (this.content instanceof THREE.Line || this.content instanceof THREE.LineSegments) {
      this.content.geometry.dispose();
    }
    this.content.traverse((child) => {
      if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
        if (child !== this.content) child.geometry.dispose();
      }
    });
    this.content = null;
  }

  dispose(): void {
    this.clearContent();
    this.sceneRemove();
    this.material.dispose();
    this.pointMaterial.dispose();
  }

  private sceneRemove(): void {
    if (this.group.parent) this.group.parent.remove(this.group);
  }
}
