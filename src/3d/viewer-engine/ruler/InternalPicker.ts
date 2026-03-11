/**
 * Picking interno para régua: detecta vértice, edge ou face no mesh do box
 * a partir do raycast. Devolve ponto 3D exato e índices para highlight.
 */

import * as THREE from "three";
import type { InternalRulerPickResult, InternalRulerPickType } from "./types";

const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vC = new THREE.Vector3();
const _proj = new THREE.Vector3();

/** Distância (m) do hit ao vértice para considerar snap a vértice. */
const VERTEX_SNAP = 0.015;
/** Distância (m) do hit à aresta para considerar snap a edge. */
const EDGE_SNAP = 0.012;

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
 * Executa o picking interno: raycaster contra os meshes dos boxes,
 * devolve ponto 3D, tipo (vertex/edge/face/hole) e índices para highlight.
 * Só considera meshes com geometry e face (triângulos).
 */
export function pickInternalAtPointer(
  raycaster: THREE.Raycaster,
  pointer: THREE.Vector2,
  camera: THREE.Camera,
  boxRoots: THREE.Object3D[]
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

  const point = hit.point.clone();
  const isHole = isHoleOrDrill(obj);
  const { type: pickType, vertexIndices } = classifyHit(obj, point, face);

  const geom = obj.geometry as THREE.BufferGeometry;
  const pos = geom.attributes.position;
  const pointOut = new THREE.Vector3();

  if (vertexIndices.length === 1) {
    const i = vertexIndices[0];
    pointOut.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    pointOut.applyMatrix4(obj.matrixWorld);
  } else if (vertexIndices.length === 2) {
    pointOut.set(pos.getX(vertexIndices[0]), pos.getY(vertexIndices[0]), pos.getZ(vertexIndices[0]));
    pointOut.applyMatrix4(obj.matrixWorld);
    _vA.copy(pointOut);
    pointOut.set(pos.getX(vertexIndices[1]), pos.getY(vertexIndices[1]), pos.getZ(vertexIndices[1]));
    pointOut.applyMatrix4(obj.matrixWorld);
    _vB.copy(pointOut);
    closestPointOnSegment(_vA, _vB, hit.point, pointOut);
  } else {
    pointOut.copy(hit.point);
  }

  return {
    point: pointOut,
    type: isHole ? "hole" : pickType,
    object: obj,
    vertexIndices,
  };
}
