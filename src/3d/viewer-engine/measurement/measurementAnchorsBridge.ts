import * as THREE from "three";
import type { MeasurementAnchorEntry } from "../../../core/viewer/measurementAnchors";
import type { MeasurementAnchorsVisualizer } from "./MeasurementAnchorsVisualizer";

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
