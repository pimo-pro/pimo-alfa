/**
 * Picking interno para régua: detecta vértice, edge ou face no mesh do box,
 * aplica Smart Snapping (vértice, midpoint, face centroid, hole center) e
 * devolve ponto efetivo (snapado quando aplicável), tipo e índices para highlight.
 */

import * as THREE from "three";
import type { InternalRulerPickResult, InternalRulerPickType, SnapType } from "./types";

const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vC = new THREE.Vector3();
const _proj = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _centroid = new THREE.Vector3();

/** Raio (m) dentro do qual o snap é aplicado. Configurável (12–20 mm). */
export const SNAP_RADIUS_M = 0.015;

/** Distância (m) do hit ao vértice para considerar snap a vértice (classificação). */
const VERTEX_SNAP = 0.015;
/** Distância (m) do hit à aresta para considerar snap a edge (classificação). */
const EDGE_SNAP = 0.012;

/** Candidato de snap: ponto 3D, tipo e índices para highlight. */
interface SnapCandidate {
  point: THREE.Vector3;
  snapType: SnapType;
  vertexIndices: number[];
}

/** Índice no position attribute (resolve index buffer se existir). */
function positionIndex(geom: THREE.BufferGeometry, faceVertexIndex: number): number {
  const idx = geom.index;
  return idx ? idx.getX(faceVertexIndex) : faceVertexIndex;
}

function getVertexWorld(mesh: THREE.Mesh, faceVertexIndex: number, out: THREE.Vector3): void {
  const geom = mesh.geometry as THREE.BufferGeometry;
  const pos = geom.attributes.position;
  if (!pos) return;
  const i = positionIndex(geom, faceVertexIndex);
  out.set(pos.getX(i), pos.getY(i), pos.getZ(i));
  out.applyMatrix4(mesh.matrixWorld);
}

function closestPointOnSegment(
  a: THREE.Vector3,
  b: THREE.Vector3,
  p: THREE.Vector3,
  out: THREE.Vector3
): void {
  _vA.subVectors(b, a);
  _vB.subVectors(p, a);
  const len = _vA.length();
  if (len < 1e-8) {
    out.copy(a);
    return;
  }
  let t = _vB.dot(_vA) / (len * len);
  t = Math.max(0, Math.min(1, t));
  out.copy(a).addScaledVector(_vA, t);
}

/**
 * Classifica o hit como vertex, edge ou face conforme proximidade aos vértices/arestas do triângulo.
 * vertexIndices são índices no position attribute (para vertex color).
 */
function classifyHit(
  mesh: THREE.Mesh,
  point: THREE.Vector3,
  face: { a: number; b: number; c: number }
): { type: InternalRulerPickType; vertexIndices: number[] } {
  const geom = mesh.geometry as THREE.BufferGeometry;
  const ia = positionIndex(geom, face.a);
  const ib = positionIndex(geom, face.b);
  const ic = positionIndex(geom, face.c);

  getVertexWorld(mesh, face.a, _vA);
  getVertexWorld(mesh, face.b, _vB);
  getVertexWorld(mesh, face.c, _vC);

  const da = point.distanceTo(_vA);
  const db = point.distanceTo(_vB);
  const dc = point.distanceTo(_vC);

  if (da < VERTEX_SNAP && da <= db && da <= dc) {
    return { type: "vertex", vertexIndices: [ia] };
  }
  if (db < VERTEX_SNAP && db <= da && db <= dc) {
    return { type: "vertex", vertexIndices: [ib] };
  }
  if (dc < VERTEX_SNAP && dc <= da && dc <= db) {
    return { type: "vertex", vertexIndices: [ic] };
  }

  closestPointOnSegment(_vA, _vB, point, _proj);
  const dab = _proj.distanceTo(point);
  closestPointOnSegment(_vB, _vC, point, _proj);
  const dbc = _proj.distanceTo(point);
  closestPointOnSegment(_vC, _vA, point, _proj);
  const dca = _proj.distanceTo(point);

  if (dab < EDGE_SNAP && dab <= dbc && dab <= dca) {
    return { type: "edge", vertexIndices: [ia, ib] };
  }
  if (dbc < EDGE_SNAP && dbc <= dab && dbc <= dca) {
    return { type: "edge", vertexIndices: [ib, ic] };
  }
  if (dca < EDGE_SNAP && dca <= dab && dca <= dbc) {
    return { type: "edge", vertexIndices: [ic, ia] };
  }

  return { type: "face", vertexIndices: [ia, ib, ic] };
}

function isHoleOrDrill(obj: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = obj;
  while (current) {
    const ud = current.userData as Record<string, unknown>;
    const name = (current as { name?: string }).name ?? "";
    if (ud?.isDrill === true || ud?.isHole === true || name.toLowerCase().includes("hole") || name.toLowerCase().includes("drill")) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Constrói candidatos de snap a partir do triângulo (3 vértices, 3 midpoints, 1 centroid).
 * Para furos, adiciona centro do furo (centroid da face).
 */
function getSnapCandidates(
  mesh: THREE.Mesh,
  face: { a: number; b: number; c: number },
  isHole: boolean
): SnapCandidate[] {
  const geom = mesh.geometry as THREE.BufferGeometry;
  const ia = positionIndex(geom, face.a);
  const ib = positionIndex(geom, face.b);
  const ic = positionIndex(geom, face.c);

  getVertexWorld(mesh, face.a, _vA);
  getVertexWorld(mesh, face.b, _vB);
  getVertexWorld(mesh, face.c, _vC);

  const candidates: SnapCandidate[] = [];

  candidates.push({ point: _vA.clone(), snapType: "vertex", vertexIndices: [ia] });
  candidates.push({ point: _vB.clone(), snapType: "vertex", vertexIndices: [ib] });
  candidates.push({ point: _vC.clone(), snapType: "vertex", vertexIndices: [ic] });

  _mid.addVectors(_vA, _vB).multiplyScalar(0.5);
  candidates.push({ point: _mid.clone(), snapType: "edgeMidpoint", vertexIndices: [ia, ib] });
  _mid.addVectors(_vB, _vC).multiplyScalar(0.5);
  candidates.push({ point: _mid.clone(), snapType: "edgeMidpoint", vertexIndices: [ib, ic] });
  _mid.addVectors(_vC, _vA).multiplyScalar(0.5);
  candidates.push({ point: _mid.clone(), snapType: "edgeMidpoint", vertexIndices: [ic, ia] });

  _centroid.addVectors(_vA, _vB).add(_vC).multiplyScalar(1 / 3);
  candidates.push({ point: _centroid.clone(), snapType: isHole ? "holeCenter" : "faceCenter", vertexIndices: [ia, ib, ic] });

  return candidates;
}

/**
 * Escolhe o candidato de snap mais próximo do ponto de impacto, dentro do raio.
 */
function resolveSnap(
  hitPoint: THREE.Vector3,
  candidates: SnapCandidate[],
  radiusM: number
): SnapCandidate | null {
  let best: SnapCandidate | null = null;
  let bestDist = radiusM;
  for (const c of candidates) {
    const d = c.point.distanceTo(hitPoint);
    if (d <= radiusM && d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/**
 * Executa o picking interno com Smart Snapping: raycaster contra os meshes dos boxes,
 * devolve ponto efetivo (snapado se dentro do raio), ponto original, ponto snapado, tipo de snap,
 * tipo (vertex/edge/face/hole) e índices para highlight.
 */
export function pickInternalAtPointer(
  raycaster: THREE.Raycaster,
  pointer: THREE.Vector2,
  camera: THREE.Camera,
  boxRoots: THREE.Object3D[],
  snapRadiusM: number = SNAP_RADIUS_M
): InternalRulerPickResult | null {
  raycaster.setFromCamera(pointer, camera);
  raycaster.layers.set(0);
  const hits = raycaster.intersectObjects(boxRoots, true);
  if (!hits.length) return null;

  const hit = hits[0];
  const obj = hit.object;
  if (!(obj instanceof THREE.Mesh) || !obj.geometry) return null;

  const face = hit.face;
  if (!face) return null;

  const pointOriginal = hit.point.clone();
  const isHole = isHoleOrDrill(obj);
  const { type: pickType, vertexIndices } = classifyHit(obj, pointOriginal, face);

  const candidates = getSnapCandidates(obj, face, isHole);
  const snap = resolveSnap(pointOriginal, candidates, snapRadiusM);

  const pointSnapped = snap ? snap.point.clone() : null;
  const snapType: SnapType | null = snap ? snap.snapType : null;
  const finalVertexIndices = snap ? snap.vertexIndices : vertexIndices;
  const point = pointSnapped ?? pointOriginal.clone();

  return {
    point,
    pointOriginal,
    pointSnapped,
    snapType,
    type: isHole ? "hole" : pickType,
    object: obj,
    vertexIndices: finalVertexIndices,
  };
}
