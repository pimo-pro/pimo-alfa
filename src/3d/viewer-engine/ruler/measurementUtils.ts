/**
 * Funções utilitárias para cálculo de distâncias no sistema de régua.
 * Ponto↔ponto, ponto↔segmento, segmento↔segmento.
 */

import * as THREE from "three";
import type { RulerDistanceResult, RulerMeasurementType } from "./types";

const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _closest = new THREE.Vector3();

/**
 * Deriva o tipo de medição a partir do vetor direção (B - A).
 * horizontal = dominante em X, vertical = dominante em Y, profundidade = dominante em Z.
 */
export function getMeasurementType(delta: THREE.Vector3): RulerMeasurementType {
  const ax = Math.abs(delta.x);
  const ay = Math.abs(delta.y);
  const az = Math.abs(delta.z);
  if (ay >= ax && ay >= az) return "vertical";
  if (az >= ax && az >= ay) return "profundidade";
  return "horizontal";
}

/**
 * Ponto mais próximo no segmento [segStart, segEnd] ao ponto p (clamp ao segmento).
 */
function closestPointOnSegment(
  segStart: THREE.Vector3,
  segEnd: THREE.Vector3,
  p: THREE.Vector3,
  out: THREE.Vector3
): void {
  _v0.subVectors(segEnd, segStart);
  _v1.subVectors(p, segStart);
  const len = _v0.length();
  if (len < 1e-8) {
    out.copy(segStart);
    return;
  }
  let t = _v1.dot(_v0) / (len * len);
  t = Math.max(0, Math.min(1, t));
  out.copy(segStart).addScaledVector(_v0, t);
}

/**
 * Distância entre dois pontos.
 * Retorna distância em metros, pointA = pA, pointB = pB, e o tipo de medição segundo a direção.
 */
export function distancePointToPoint(
  pA: THREE.Vector3,
  pB: THREE.Vector3
): RulerDistanceResult {
  const distance = pA.distanceTo(pB);
  _v0.subVectors(pB, pA);
  const measurementType = distance < 1e-9 ? "horizontal" : getMeasurementType(_v0);
  return {
    distance,
    pointA: pA.clone(),
    pointB: pB.clone(),
    measurementType,
  };
}

/**
 * Distância entre um ponto e um segmento (edge).
 * pointA = ponto dado, pointB = ponto mais próximo no segmento.
 */
export function distancePointToSegment(
  point: THREE.Vector3,
  segStart: THREE.Vector3,
  segEnd: THREE.Vector3
): RulerDistanceResult {
  closestPointOnSegment(segStart, segEnd, point, _closest);
  const distance = point.distanceTo(_closest);
  _v0.subVectors(_closest, point);
  const measurementType = distance < 1e-9 ? "horizontal" : getMeasurementType(_v0);
  return {
    distance,
    pointA: point.clone(),
    pointB: _closest.clone(),
    measurementType,
  };
}

/**
 * Distância entre dois segmentos (edge ↔ edge).
 * Retorna os dois pontos mais próximos (um em cada segmento) e a distância entre eles.
 * Usa resolução analítica; quando segmentos são paralelos, testa extremos.
 */
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
    // Segmentos (quase) paralelos: testar s=0, s=1 e t=0, t=1 e ficar com o par de menor distância
    let bestDistSq = Infinity;
    let bestS = 0;
    let bestT = 0;
    const tryPair = (sVal: number, tVal: number) => {
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
      tryPair(0, Math.max(0, Math.min(1, e / c)));
      tryPair(1, Math.max(0, Math.min(1, (b + e) / c)));
    } else {
      tryPair(0, 0);
      tryPair(1, 0);
    }
    if (a > 1e-12) {
      tryPair(Math.max(0, Math.min(1, -d / a)), 0);
      tryPair(Math.max(0, Math.min(1, (b - d) / a)), 1);
    }
    s = bestS;
    t = bestT;
  } else {
    s = (b * e - c * d) / det;
    t = (a * e - b * d) / det;
    s = Math.max(0, Math.min(1, s));
    t = Math.max(0, Math.min(1, t));
  }

  const pointA = new THREE.Vector3().copy(seg1Start).addScaledVector(u, s);
  const pointB = new THREE.Vector3().copy(seg2Start).addScaledVector(v, t);
  const distance = pointA.distanceTo(pointB);
  const delta = new THREE.Vector3().subVectors(pointB, pointA);
  const measurementType = distance < 1e-9 ? "horizontal" : getMeasurementType(delta);

  return {
    distance,
    pointA,
    pointB,
    measurementType,
  };
}
