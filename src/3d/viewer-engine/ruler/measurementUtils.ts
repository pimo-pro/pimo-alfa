/**
 * Utilitários de medição em world-space para a régua.
 * Todas as distâncias são calculadas em metros e convertidas para mm na apresentação.
 */

import * as THREE from "three";
import type { RulerDistanceResult, RulerMeasurementType } from "./types";

export const M_TO_MM = 1000;
const EPS = 1e-9;
const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _closest = new THREE.Vector3();

export function toMmRound(meters: number): number {
  return Math.round(meters * M_TO_MM);
}

export function getMeasurementType(delta: THREE.Vector3): RulerMeasurementType {
  const ax = Math.abs(delta.x);
  const ay = Math.abs(delta.y);
  const az = Math.abs(delta.z);
  if (ay >= ax && ay >= az) return "vertical";
  if (az >= ax && az >= ay) return "profundidade";
  return "horizontal";
}

export function closestPointOnSegment(
  segStart: THREE.Vector3,
  segEnd: THREE.Vector3,
  point: THREE.Vector3,
  out: THREE.Vector3
): void {
  _v0.subVectors(segEnd, segStart);
  _v1.subVectors(point, segStart);
  const lenSq = _v0.lengthSq();
  if (lenSq < EPS) {
    out.copy(segStart);
    return;
  }
  let t = _v1.dot(_v0) / lenSq;
  t = Math.max(0, Math.min(1, t));
  out.copy(segStart).addScaledVector(_v0, t);
}

export function distancePointToPoint(pA: THREE.Vector3, pB: THREE.Vector3): RulerDistanceResult {
  const distance = pA.distanceTo(pB);
  _v0.subVectors(pB, pA);
  return {
    distance,
    pointA: pA.clone(),
    pointB: pB.clone(),
    measurementType: distance < EPS ? "horizontal" : getMeasurementType(_v0),
  };
}

export function distancePointToSegment(
  point: THREE.Vector3,
  segStart: THREE.Vector3,
  segEnd: THREE.Vector3
): RulerDistanceResult {
  closestPointOnSegment(segStart, segEnd, point, _closest);
  const distance = point.distanceTo(_closest);
  _v0.subVectors(_closest, point);
  return {
    distance,
    pointA: point.clone(),
    pointB: _closest.clone(),
    measurementType: distance < EPS ? "horizontal" : getMeasurementType(_v0),
  };
}

export function distanceSegmentToSegment(
  seg1Start: THREE.Vector3,
  seg1End: THREE.Vector3,
  seg2Start: THREE.Vector3,
  seg2End: THREE.Vector3
): RulerDistanceResult {
  const u = new THREE.Vector3().subVectors(seg1End, seg1Start);
  const v = new THREE.Vector3().subVectors(seg2End, seg2Start);
  const w = new THREE.Vector3().subVectors(seg1Start, seg2Start);

  const a = u.dot(u);
  const b = u.dot(v);
  const c = v.dot(v);
  const d = u.dot(w);
  const e = v.dot(w);

  const det = a * c - b * b;
  let s: number;
  let t: number;

  if (det < 1e-12) {
    let bestDistSq = Infinity;
    let bestS = 0;
    let bestT = 0;
    const test = (sVal: number, tVal: number) => {
      const pa = new THREE.Vector3().copy(seg1Start).addScaledVector(u, sVal);
      const pb = new THREE.Vector3().copy(seg2Start).addScaledVector(v, tVal);
      const dsq = pa.distanceToSquared(pb);
      if (dsq < bestDistSq) {
        bestDistSq = dsq;
        bestS = sVal;
        bestT = tVal;
      }
    };
    if (c > 1e-12) {
      test(0, Math.max(0, Math.min(1, e / c)));
      test(1, Math.max(0, Math.min(1, (b + e) / c)));
    } else {
      test(0, 0);
      test(1, 0);
    }
    if (a > 1e-12) {
      test(Math.max(0, Math.min(1, -d / a)), 0);
      test(Math.max(0, Math.min(1, (b - d) / a)), 1);
    }
    s = bestS;
    t = bestT;
  } else {
    s = Math.max(0, Math.min(1, (b * e - c * d) / det));
    t = Math.max(0, Math.min(1, (a * e - b * d) / det));
  }

  const pointA = new THREE.Vector3().copy(seg1Start).addScaledVector(u, s);
  const pointB = new THREE.Vector3().copy(seg2Start).addScaledVector(v, t);
  const distance = pointA.distanceTo(pointB);
  const delta = new THREE.Vector3().subVectors(pointB, pointA);
  return {
    distance,
    pointA,
    pointB,
    measurementType: distance < EPS ? "horizontal" : getMeasurementType(delta),
  };
}

export function buildWorldBox(object: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  object.updateMatrixWorld(true);
  box.setFromObject(object);
  return box;
}

export function overlapRange(aMin: number, aMax: number, bMin: number, bMax: number): [number, number] | null {
  const min = Math.max(aMin, bMin);
  const max = Math.min(aMax, bMax);
  if (max < min) return null;
  return [min, max];
}

export function centerOfRange(min: number, max: number): number {
  return (min + max) * 0.5;
}
