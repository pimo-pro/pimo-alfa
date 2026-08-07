import * as THREE from "three";
import type { MeasurementAnchorEntry } from "../../../core/viewer/measurementAnchors";
import type { MeasurementAnchorsVisualizer } from "./MeasurementAnchorsVisualizer";
import type { MeasurementSnapResult } from "./measurementSnapService";

export function syncMeasurementAnchorsToVisualizer(
  visualizer: MeasurementAnchorsVisualizer | null | undefined,
  anchors: MeasurementAnchorEntry[],
  selectedMesh?: THREE.Object3D | null
): void {
  const pos = selectedMesh ? new THREE.Vector3() : null;
  selectedMesh?.getWorldPosition(pos!);
  visualizer?.sync(anchors, pos);
}

export function createMeasurementAnchorFromWorldHit(
  hit: THREE.Vector3 | null
): MeasurementAnchorEntry | null {
  if (!hit) return null;
  return {
    id: `anchor-${Date.now()}`,
    position: { x: hit.x, y: hit.y, z: hit.z },
    createdAt: Date.now(),
  };
}

/** Cria uma âncora a partir do resultado do serviço de snapping unificado (vértice/furo/aresta/etc). */
export function createMeasurementAnchorFromSnap(
  snap: MeasurementSnapResult | null
): MeasurementAnchorEntry | null {
  if (!snap) return null;
  return {
    id: `anchor-${Date.now()}`,
    position: { x: snap.world.x, y: snap.world.y, z: snap.world.z },
    createdAt: Date.now(),
  };
}
