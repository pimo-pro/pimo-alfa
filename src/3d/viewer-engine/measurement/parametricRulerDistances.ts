import * as THREE from "three";
import { aabb3FromThreeBox3, parametricRulerHitToThree } from "@/viewer/core/viewerUtils";
import { setBox3FromObjectExcludingLayoutProxy } from "../box/boxAabbUtils";
import type { ViewerBoxEntry } from "../types";
import type { RulerMeasurementHit } from "./unifiedMeasurementTypes";
import {
  floorClearanceMeasurement,
  nearestBoxGapBetweenPair,
  nearestWallMeasurement,
  type ParametricRulerHit,
} from "./parametricDimensions";

export type ParametricRulerRoomBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
};

export type ParametricRulerDistanceDeps = {
  boxes: Map<string, ViewerBoxEntry>;
  selectedBoxId: string | null;
  roomBounds: ParametricRulerRoomBounds | null;
};

export function computeDistanceToNearestBox({
  boxes,
  selectedBoxId,
}: ParametricRulerDistanceDeps): RulerMeasurementHit | null {
  if (!selectedBoxId) return null;
  const selectedEntry = boxes.get(selectedBoxId);
  if (!selectedEntry) return null;

  selectedEntry.mesh.updateMatrixWorld(true);
  const selectedThree = new THREE.Box3();
  setBox3FromObjectExcludingLayoutProxy(selectedThree, selectedEntry.mesh);
  const selectedAabb = aabb3FromThreeBox3(selectedThree);

  let best: ParametricRulerHit | null = null;
  boxes.forEach((entry, id) => {
    if (id === selectedBoxId) return;
    entry.mesh.updateMatrixWorld(true);
    const otherBox = new THREE.Box3();
    setBox3FromObjectExcludingLayoutProxy(otherBox, entry.mesh);
    const otherAabb = aabb3FromThreeBox3(otherBox);
    const hit = nearestBoxGapBetweenPair(selectedAabb, otherAabb);
    if (hit && (!best || hit.distanceM < best.distanceM)) best = hit;
  });
  return best ? parametricRulerHitToThree(best) : null;
}

export function computeDistanceToNearestWall({
  boxes,
  selectedBoxId,
  roomBounds,
}: ParametricRulerDistanceDeps): RulerMeasurementHit | null {
  if (!selectedBoxId) return null;
  const selectedEntry = boxes.get(selectedBoxId);
  if (!selectedEntry || !roomBounds) return null;

  selectedEntry.mesh.updateMatrixWorld(true);
  const wallSelBox = new THREE.Box3();
  setBox3FromObjectExcludingLayoutProxy(wallSelBox, selectedEntry.mesh);
  const boxAabb = aabb3FromThreeBox3(wallSelBox);
  const hit = nearestWallMeasurement(boxAabb, {
    minX: roomBounds.minX,
    maxX: roomBounds.maxX,
    minZ: roomBounds.minZ,
    maxZ: roomBounds.maxZ,
  });
  return hit ? parametricRulerHitToThree(hit) : null;
}

export function computeDistanceToFloor({
  boxes,
  selectedBoxId,
  roomBounds,
}: ParametricRulerDistanceDeps): RulerMeasurementHit | null {
  if (!selectedBoxId) return null;
  const selectedEntry = boxes.get(selectedBoxId);
  if (!selectedEntry) return null;

  selectedEntry.mesh.updateMatrixWorld(true);
  const floorSelBox = new THREE.Box3();
  setBox3FromObjectExcludingLayoutProxy(floorSelBox, selectedEntry.mesh);
  const boxAabb = aabb3FromThreeBox3(floorSelBox);
  const floorY = roomBounds?.minY ?? 0;
  const hit = floorClearanceMeasurement(boxAabb, floorY);
  return hit ? parametricRulerHitToThree(hit) : null;
}
