/**
 * Edge Picking para o modo régua: detecta o edge (ou vértice) mais próximo do cursor
 * em caixas, paredes, chão, furos e pontos. Usa Raycaster + bounding box em mundo.
 */

import * as THREE from "three";
import type { RulerEdgePickResult, RulerPickType } from "./types";

const _box3 = new THREE.Box3();
const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _point = new THREE.Vector3();

/** Distância máxima (em metros) do hit point a um vértice para considerar tipo "ponto". */
const VERTEX_SNAP_THRESHOLD = 0.02;

/**
 * Classifica o tipo da entidade a partir do mesh atingido (sobe na hierarquia pelo userData).
 */
function classifyPickType(obj: THREE.Object3D): RulerPickType {
  let current: THREE.Object3D | null = obj;
  while (current) {
    const ud = current.userData as Record<string, unknown>;
    if (ud?.isRoomElement === true) return "furo";
    if (ud?.isRoomFloor === true) return "chão";
    if (ud?.isRoomCeiling === true) return "chão"; // teto tratado como chão para medição
    if (ud?.isRoomWall === true) return "parede";
    if (typeof ud?.boxId === "string" && ud.boxId.length > 0) return "caixa";
    current = current.parent;
  }
  return "parede"; // fallback (room group)
}

/**
 * Obtém os 8 vértices do Box3 em mundo (ordem padrão: min depois max por eixo).
 */
function getBox3CornersWorld(box: THREE.Box3): THREE.Vector3[] {
  const min = box.min;
  const max = box.max;
  return [
    new THREE.Vector3(min.x, min.y, min.z),
    new THREE.Vector3(max.x, min.y, min.z),
    new THREE.Vector3(max.x, min.y, max.z),
    new THREE.Vector3(min.x, min.y, max.z),
    new THREE.Vector3(min.x, max.y, min.z),
    new THREE.Vector3(max.x, max.y, min.z),
    new THREE.Vector3(max.x, max.y, max.z),
    new THREE.Vector3(min.x, max.y, max.z),
  ];
}

/** Pares de índices dos 12 edges de um box (vértices 0..7). */
const BOX_EDGE_INDICES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0], // base
  [4, 5], [5, 6], [6, 7], [7, 4], // top
  [0, 4], [1, 5], [2, 6], [3, 7], // vertical
];

/**
 * Ponto mais próximo no segmento [a, b] ao ponto p. Clamp ao segmento.
 */
function closestPointOnSegment(
  a: THREE.Vector3,
  b: THREE.Vector3,
  p: THREE.Vector3,
  out: THREE.Vector3
): void {
  _v0.subVectors(b, a);
  _v1.subVectors(p, a);
  const len = _v0.length();
  if (len < 1e-8) {
    out.copy(a);
    return;
  }
  let t = _v1.dot(_v0) / (len * len);
  t = Math.max(0, Math.min(1, t));
  out.copy(a).addScaledVector(_v0, t);
}

/**
 * Obtém edges (segmentos em mundo) para um Object3D: usa bounding box em mundo.
 */
function getEdgesForObject(object: THREE.Object3D): { start: THREE.Vector3; end: THREE.Vector3 }[] {
  _box3.setFromObject(object);
  const corners = getBox3CornersWorld(_box3);
  const edges: { start: THREE.Vector3; end: THREE.Vector3 }[] = [];
  for (const [i, j] of BOX_EDGE_INDICES) {
    const start = corners[i];
    const end = corners[j];
    if (start.distanceTo(end) < 1e-6) continue; // ignora edge degenerado
    edges.push({ start, end });
  }
  return edges;
}

/**
 * Obtém os 8 vértices do bbox em mundo (para snap a ponto).
 */
function getVerticesForObject(object: THREE.Object3D): THREE.Vector3[] {
  _box3.setFromObject(object);
  return getBox3CornersWorld(_box3);
}

/**
 * Encontra o edge mais próximo do ponto hit e devolve o ponto no edge mais próximo do hit.
 */
function pickClosestEdge(
  object: THREE.Object3D,
  hitPoint: THREE.Vector3,
  type: RulerPickType
): RulerEdgePickResult {
  const vertices = getVerticesForObject(object);
  let minDistSq = Infinity;
  let closestVertex: THREE.Vector3 | null = null;
  for (const v of vertices) {
    const d = v.distanceToSquared(hitPoint);
    if (d < minDistSq) {
      minDistSq = d;
      closestVertex = v;
    }
  }
  const vertexThresholdSq = VERTEX_SNAP_THRESHOLD * VERTEX_SNAP_THRESHOLD;
  if (closestVertex && minDistSq < vertexThresholdSq) {
    return {
      point: closestVertex.clone(),
      object,
      type: "ponto",
    };
  }

  const edges = getEdgesForObject(object);
  let bestPoint = new THREE.Vector3();
  let bestDistSq = Infinity;
  for (const { start, end } of edges) {
    closestPointOnSegment(start, end, hitPoint, _point);
    const d = _point.distanceToSquared(hitPoint);
    if (d < bestDistSq) {
      bestDistSq = d;
      bestPoint.copy(_point);
    }
  }
  return {
    point: bestPoint.clone(),
    object,
    type,
  };
}

/**
 * Executa o Edge Picking: raycaster a partir do pointer, primeiro hit, classifica tipo,
 * obtém ponto no edge (ou vértice) mais próximo do ponto de impacto.
 * getBboxRoot: opcional; se fornecido, usa este objeto para extrair edges (ex.: raiz da caixa em vez do filho).
 * Retorna null se não houver hit ou raycaster/pointer inválido.
 */
export function getRulerEdgeAtPointer(
  raycaster: THREE.Raycaster,
  pointer: THREE.Vector2,
  camera: THREE.Camera,
  roots: THREE.Object3D[],
  getBboxRoot?: (hitObject: THREE.Object3D) => THREE.Object3D
): RulerEdgePickResult | null {
  raycaster.setFromCamera(pointer, camera);
  raycaster.layers.set(0);
  const hits = raycaster.intersectObjects(roots, true);
  if (!hits.length) return null;

  const hit = hits[0];
  const hitObject = hit.object;
  const object = getBboxRoot ? getBboxRoot(hitObject) : hitObject;
  const hitPoint = hit.point.clone();
  const type = classifyPickType(hitObject);
  return pickClosestEdge(object, hitPoint, type);
}
