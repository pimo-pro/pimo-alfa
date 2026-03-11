/**
 * RulerManager: calcula todas as medições candidatas (esquerda/direita, frente/trás, chão/teto).
 * Regras de exibição (500 mm horizontal, 200 mm front/back, floor > 0, ceiling < 200 mm) são aplicadas no overlay.
 */

import * as THREE from "three";
import type { RulerManagerResult, RulerManagerMeasurement } from "./types";

const M_TO_MM = 1000;

function toMmRound(m: number): number {
  return Math.round(m * M_TO_MM);
}

function measurement(pointA: THREE.Vector3, pointB: THREE.Vector3): RulerManagerMeasurement {
  const distanceM = pointA.distanceTo(pointB);
  return {
    distanceMm: toMmRound(distanceM),
    pointA: pointA.clone(),
    pointB: pointB.clone(),
  };
}

export type RulerManagerBoxData = {
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
};

export type RulerManagerRoomBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

export type RulerManagerOtherBox = {
  min: THREE.Vector3;
  max: THREE.Vector3;
  centerX: number;
};

/**
 * Calcula todas as medições candidatas para uma caixa de referência.
 * – horizontalLeft / horizontalRight: parede ou caixa adjacente no eixo X
 * – front / back: parede em Z (minZ, maxZ)
 * – floor / ceiling: chão e teto
 */
export function getRulerMeasurements(
  box: RulerManagerBoxData,
  roomBounds: RulerManagerRoomBounds | null,
  otherBoxesSortedByX: RulerManagerOtherBox[]
): RulerManagerResult {
  const { min: bMin, max: bMax, center: bCenter } = box;
  const cx = bCenter.x;
  const cy = bCenter.y;
  const cz = bCenter.z;

  let horizontalLeft: RulerManagerMeasurement | null = null;
  let horizontalRight: RulerManagerMeasurement | null = null;
  let front: RulerManagerMeasurement | null = null;
  let back: RulerManagerMeasurement | null = null;
  let floor: RulerManagerMeasurement | null = null;
  let ceiling: RulerManagerMeasurement | null = null;

  if (roomBounds) {
    const { minX, maxX, minY, maxY, minZ, maxZ } = roomBounds;

    horizontalLeft = measurement(
      new THREE.Vector3(minX, cy, cz),
      new THREE.Vector3(bMin.x, cy, cz)
    );
    horizontalRight = measurement(
      new THREE.Vector3(bMax.x, cy, cz),
      new THREE.Vector3(maxX, cy, cz)
    );
    front = measurement(
      new THREE.Vector3(cx, cy, minZ),
      new THREE.Vector3(cx, cy, bMin.z)
    );
    back = measurement(
      new THREE.Vector3(cx, cy, bMax.z),
      new THREE.Vector3(cx, cy, maxZ)
    );
    floor = measurement(
      new THREE.Vector3(cx, bMin.y, cz),
      new THREE.Vector3(cx, minY, cz)
    );
    ceiling = measurement(
      new THREE.Vector3(cx, bMax.y, cz),
      new THREE.Vector3(cx, maxY, cz)
    );
  }

  const refCenterX = (bMin.x + bMax.x) * 0.5;
  const refIdx = otherBoxesSortedByX.findIndex((o) => o.centerX >= refCenterX);
  const leftIdx = refIdx === -1 ? otherBoxesSortedByX.length - 1 : refIdx > 0 ? refIdx - 1 : -1;
  const rightIdx = refIdx >= 0 && refIdx < otherBoxesSortedByX.length ? refIdx : -1;

  if (leftIdx >= 0) {
    const left = otherBoxesSortedByX[leftIdx];
    const m = measurement(
      new THREE.Vector3(left.max.x, cy, cz),
      new THREE.Vector3(bMin.x, cy, cz)
    );
    if (!horizontalLeft || m.distanceMm < horizontalLeft.distanceMm) {
      horizontalLeft = m;
    }
  }
  if (rightIdx >= 0) {
    const right = otherBoxesSortedByX[rightIdx];
    const m = measurement(
      new THREE.Vector3(bMax.x, cy, cz),
      new THREE.Vector3(right.min.x, cy, cz)
    );
    if (!horizontalRight || m.distanceMm < horizontalRight.distanceMm) {
      horizontalRight = m;
    }
  }

  return {
    horizontalLeft,
    horizontalRight,
    front,
    back,
    floor,
    ceiling,
  };
}
