/**
 * Overlay 3D: linhas entre furos emparelhados (modo design industrial).
 */

import * as THREE from "three";
import {
  collectPairedHoleLineSegments,
  pairedSegmentsToFloat32Array,
  type DesignPanelMeshRef,
} from "../../../core/industrialDesigner/industrialDesignPairingLines";
import { INDUSTRIAL_DESIGN_PAIRING_LINE_COLOR } from "../../../core/industrialDesigner/drillHoleViewerColors";
import type { IndustrialDesignBox } from "../../../core/industrialDesigner/types";

function buildMeshLookup(boxMesh: THREE.Object3D): Map<string, DesignPanelMeshRef> {
  const map = new Map<string, DesignPanelMeshRef>();
  const tmpMatrix = new THREE.Matrix4();
  const invBoxWorld = new THREE.Matrix4();

  boxMesh.updateMatrixWorld(true);
  invBoxWorld.copy(boxMesh.matrixWorld).invert();

  boxMesh.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const panelId = node.userData?.panelId as string | undefined;
    if (!panelId) return;

    const panelType = (node.userData?.panelType as string | undefined) ?? "top";
    const widthM = Number(node.userData?.width) || 0;
    const heightM = Number(node.userData?.height) || 0;
    if (widthM <= 0 || heightM <= 0) return;

    node.updateMatrixWorld(true);
    tmpMatrix.copy(node.matrixWorld).premultiply(invBoxWorld);
    map.set(panelId, {
      panelId,
      panelType,
      widthM,
      heightM,
      matrix: tmpMatrix.toArray(),
    });
  });

  return map;
}

export class IndustrialDesignViewerOverlay {
  private readonly pairingMaterial: THREE.LineBasicMaterial;
  private readonly groups = new Map<string, THREE.Group>();

  constructor() {
    this.pairingMaterial = new THREE.LineBasicMaterial({
      color: INDUSTRIAL_DESIGN_PAIRING_LINE_COLOR,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
    });
  }

  syncPairingLines(
    boxId: string,
    boxMesh: THREE.Object3D,
    designBox: IndustrialDesignBox | null,
    enabled: boolean
  ): void {
    this.clear(boxId, boxMesh);
    if (!enabled || !designBox) return;

    const meshByPanelId = buildMeshLookup(boxMesh);
    const segments = collectPairedHoleLineSegments(designBox, meshByPanelId);
    if (!segments.length) return;

    const positions = pairedSegmentsToFloat32Array(segments);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const lines = new THREE.LineSegments(geometry, this.pairingMaterial);
    lines.userData.isIndustrialDesignPairingOverlay = true;
    lines.raycast = () => null;
    lines.frustumCulled = false;

    const group = new THREE.Group();
    group.userData.isIndustrialDesignPairingOverlay = true;
    group.add(lines);
    boxMesh.add(group);
    this.groups.set(boxId, group);
  }

  clear(boxId: string, boxMesh: THREE.Object3D): void {
    const existing = this.groups.get(boxId);
    if (existing) {
      boxMesh.remove(existing);
      existing.traverse((child) => {
        if (child instanceof THREE.LineSegments) {
          child.geometry.dispose();
        }
      });
      this.groups.delete(boxId);
    }

    const orphans = boxMesh.children.filter(
      (c) => c.userData?.isIndustrialDesignPairingOverlay === true
    );
    for (const node of orphans) {
      boxMesh.remove(node);
      node.traverse((child) => {
        if (child instanceof THREE.LineSegments) {
          child.geometry.dispose();
        }
      });
    }
  }

  clearAll(): void {
    this.groups.clear();
  }
}
