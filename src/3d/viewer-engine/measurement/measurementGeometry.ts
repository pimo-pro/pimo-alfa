import * as THREE from "three";
import type { MeasurementSnapKind } from "./measurementSnapService";

function metersToMm01(distanceM: number): number {
  return Math.round(distanceM * 10000) / 10;
}

export type SnapSurfaceKind = "planar" | "curved" | "edge" | "hole" | "free";

export type MeasurementSnapGeometry = {
  surfaceKind: SnapSurfaceKind;
  /** Normal da superfície no ponto (mundo, unitário), se existir. */
  normal?: { x: number; y: number; z: number };
  /** Tangente (aresta ou tangente de superfície), mundo unitário. */
  tangent?: { x: number; y: number; z: number };
  /** Segmento de aresta em mundo (quando kind=edge/edgeMid). */
  edgeA?: { x: number; y: number; z: number };
  edgeB?: { x: number; y: number; z: number };
  meshUuid?: string;
};

export type UnifiedMeasurementMetrics = {
  dxMm: number;
  dyMm: number;
  dzMm: number;
  distanceMm: number;
  /** Distância ao longo da superfície (geodésica simples), quando aplicável. */
  surfaceMm?: number;
  /** Distância ao longo da aresta, quando aplicável. */
  edgeMm?: number;
  /** Distância normal à face (projecção perpendicular), quando aplicável. */
  normalMm?: number;
  /** Vector centro→centro (furos), em mm. */
  holeVectorMm?: { x: number; y: number; z: number };
};

const _n = new THREE.Vector3();
const _t = new THREE.Vector3();
const _tmp = new THREE.Vector3();

/** Normal de face no espaço mundo (Intersection.face). */
export function surfaceNormalAt(
  mesh: THREE.Mesh,
  face: { normal: THREE.Vector3 } | null | undefined
): THREE.Vector3 | null {
  if (!face) return null;
  mesh.updateMatrixWorld(true);
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  return _n.copy(face.normal).applyMatrix3(normalMatrix).normalize().clone();
}

/** Tangente no ponto: direcção da aresta, ou tangente ortogonal à normal (fallback). */
export function surfaceTangentAt(
  normal: THREE.Vector3 | null,
  edgeA?: THREE.Vector3 | null,
  edgeB?: THREE.Vector3 | null
): THREE.Vector3 | null {
  if (edgeA && edgeB) {
    _t.subVectors(edgeB, edgeA);
    if (_t.lengthSq() > 1e-12) return _t.normalize().clone();
  }
  if (!normal) return null;
  const ax =
    Math.abs(normal.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  return _t.crossVectors(normal, ax).normalize().clone();
}

function projectOnPlane(
  point: THREE.Vector3,
  planePoint: THREE.Vector3,
  normal: THREE.Vector3
): THREE.Vector3 {
  const d = _tmp.subVectors(point, planePoint).dot(normal);
  return point.clone().addScaledVector(normal, -d);
}

/** Geodésica plana: distância entre projecções no plano (point, normal). */
export function planarGeodesicDistanceM(
  a: THREE.Vector3,
  b: THREE.Vector3,
  planePoint: THREE.Vector3,
  normal: THREE.Vector3
): number {
  const pa = projectOnPlane(a, planePoint, normal);
  const pb = projectOnPlane(b, planePoint, normal);
  return pa.distanceTo(pb);
}

/**
 * Geodésica curva simples (aproximação cilíndrica):
 * usa o centro do bounding sphere do mesh e o arco entre A e B.
 * Se as normais forem quase iguais (planar), devolve null.
 */
export function curvedGeodesicDistanceM(
  a: THREE.Vector3,
  b: THREE.Vector3,
  mesh: THREE.Mesh,
  normalA?: THREE.Vector3 | null,
  normalB?: THREE.Vector3 | null
): number | null {
  mesh.geometry.computeBoundingSphere();
  const sphere = mesh.geometry.boundingSphere;
  if (!sphere || sphere.radius <= 1e-6) return null;
  const center = sphere.center.clone().applyMatrix4(mesh.matrixWorld);
  const rA = a.distanceTo(center);
  const rB = b.distanceTo(center);
  const r = (rA + rB) * 0.5;
  if (r <= 1e-6) return null;
  const va = a.clone().sub(center).normalize();
  const vb = b.clone().sub(center).normalize();
  const cos = Math.min(1, Math.max(-1, va.dot(vb)));
  const angle = Math.acos(cos);
  if (normalA && normalB && normalA.dot(normalB) > 0.985) return null;
  return r * angle;
}

function sameEdge(
  a?: { x: number; y: number; z: number },
  b?: { x: number; y: number; z: number },
  c?: { x: number; y: number; z: number },
  d?: { x: number; y: number; z: number }
): boolean {
  if (!a || !b || !c || !d) return false;
  const eq = (p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }) =>
    Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6 && Math.abs(p.z - q.z) < 1e-6;
  return (eq(a, c) && eq(b, d)) || (eq(a, d) && eq(b, c));
}

export function computeCompositeMetrics(
  aWorld: THREE.Vector3,
  bWorld: THREE.Vector3,
  aKind: MeasurementSnapKind,
  bKind: MeasurementSnapKind,
  aGeom?: MeasurementSnapGeometry | null,
  bGeom?: MeasurementSnapGeometry | null,
  meshA?: THREE.Mesh | null,
  _meshB?: THREE.Mesh | null
): UnifiedMeasurementMetrics {
  const dx = bWorld.x - aWorld.x;
  const dy = bWorld.y - aWorld.y;
  const dz = bWorld.z - aWorld.z;
  const distanceM = aWorld.distanceTo(bWorld);
  const metrics: UnifiedMeasurementMetrics = {
    dxMm: metersToMm01(Math.abs(dx)),
    dyMm: metersToMm01(Math.abs(dy)),
    dzMm: metersToMm01(Math.abs(dz)),
    distanceMm: metersToMm01(distanceM),
  };

  if (aKind === "holeCenter" && bKind === "holeCenter") {
    metrics.holeVectorMm = {
      x: metersToMm01(dx),
      y: metersToMm01(dy),
      z: metersToMm01(dz),
    };
  }

  const nA = aGeom?.normal
    ? new THREE.Vector3(aGeom.normal.x, aGeom.normal.y, aGeom.normal.z)
    : null;
  const nB = bGeom?.normal
    ? new THREE.Vector3(bGeom.normal.x, bGeom.normal.y, bGeom.normal.z)
    : null;

  if (nA && nA.lengthSq() > 1e-12) {
    const n = nA.clone().normalize();
    if (nB && nB.lengthSq() > 1e-12) n.add(nB.clone().normalize()).normalize();
    metrics.normalMm = metersToMm01(Math.abs(_tmp.subVectors(bWorld, aWorld).dot(n)));
  }

  if (
    (aKind === "edge" || aKind === "edgeMid") &&
    (bKind === "edge" || bKind === "edgeMid") &&
    sameEdge(aGeom?.edgeA, aGeom?.edgeB, bGeom?.edgeA, bGeom?.edgeB)
  ) {
    metrics.edgeMm = metrics.distanceMm;
  } else if ((aKind === "edge" || aKind === "edgeMid") && aGeom?.edgeA && aGeom?.edgeB) {
    const ea = new THREE.Vector3(aGeom.edgeA.x, aGeom.edgeA.y, aGeom.edgeA.z);
    const eb = new THREE.Vector3(aGeom.edgeB.x, aGeom.edgeB.y, aGeom.edgeB.z);
    const dir = eb.clone().sub(ea);
    const len = dir.length();
    if (len > 1e-9) {
      const t = Math.min(1, Math.max(0, bWorld.clone().sub(ea).dot(dir) / (len * len)));
      const proj = ea.clone().addScaledVector(dir, t);
      metrics.edgeMm = metersToMm01(aWorld.distanceTo(proj));
    }
  }

  const sameMesh = aGeom?.meshUuid && bGeom?.meshUuid && aGeom.meshUuid === bGeom.meshUuid;
  if (sameMesh && nA) {
    const curved = aGeom?.surfaceKind === "curved" || bGeom?.surfaceKind === "curved";
    if (curved && meshA) {
      const g = curvedGeodesicDistanceM(aWorld, bWorld, meshA, nA, nB);
      if (g != null) metrics.surfaceMm = metersToMm01(g);
    } else {
      metrics.surfaceMm = metersToMm01(planarGeodesicDistanceM(aWorld, bWorld, aWorld, nA));
    }
  }

  return metrics;
}

/** Métricas mínimas a partir de dois pontos mundo (para entradas legadas sem metrics). */
export function metricsFromWorldPoints(a: THREE.Vector3, b: THREE.Vector3): UnifiedMeasurementMetrics {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return {
    dxMm: metersToMm01(Math.abs(dx)),
    dyMm: metersToMm01(Math.abs(dy)),
    dzMm: metersToMm01(Math.abs(dz)),
    distanceMm: metersToMm01(a.distanceTo(b)),
  };
}
