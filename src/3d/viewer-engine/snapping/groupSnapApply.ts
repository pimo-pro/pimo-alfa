import * as THREE from "three";
import { setBox3FromObjectExcludingLayoutProxy } from "../box/boxAabbUtils";
import { findBestSnapForEntity, computeSnapCandidates } from "./smartSnapEngine";
import type { SmartAlignSnapContext, SmartSnapEntity, UnifiedSnapCandidate } from "./smartAlignSnapTypes";

export type SmartSnapMeshTarget = {
  encodedId: string;
  mesh: THREE.Object3D;
  entity: SmartSnapEntity;
};

export type SmartSnapGroupResult = {
  applied: boolean;
  candidate: UnifiedSnapCandidate | null;
  delta: THREE.Vector3;
};

const _box = new THREE.Box3();
const _center = new THREE.Vector3();
const _delta = new THREE.Vector3();

/** Calcula centro do AABB unificado de vários meshes (metros). */
export function computeMeshesCenter(meshes: THREE.Object3D[]): THREE.Vector3 | null {
  _box.makeEmpty();
  for (const mesh of meshes) {
    mesh.updateMatrixWorld(true);
    setBox3FromObjectExcludingLayoutProxy(_box, mesh);
  }
  if (_box.isEmpty()) return null;
  return _box.getCenter(new THREE.Vector3());
}

/**
 * Snap inteligente para um objeto ou grupo de meshes.
 * Para grupos, aplica o mesmo delta a todos os membros.
 */
export function applySmartSnap(
  targets: SmartSnapMeshTarget[],
  others: SmartSnapEntity[],
  ctx: SmartAlignSnapContext
): SmartSnapGroupResult {
  const empty: SmartSnapGroupResult = { applied: false, candidate: null, delta: new THREE.Vector3() };
  if (!targets.length) return empty;

  const primary = targets.find((t) => t.entity.kind === "box") ?? targets[0];
  const best = findBestSnapForEntity(primary.entity, ctx, others);
  if (!best) return empty;

  _delta.copy(best.delta);
  if (_delta.lengthSq() < 1e-12) return empty;

  for (const target of targets) {
    target.mesh.position.add(_delta);
    target.mesh.updateMatrixWorld(true);
  }

  return { applied: true, candidate: best, delta: _delta.clone() };
}

/** Candidatos de snap entre grupo (proxy AABB) e outras entidades. */
export function computeGroupSnapCandidates(
  groupMeshes: THREE.Object3D[],
  otherEntities: SmartSnapEntity[],
  ctx: SmartAlignSnapContext
): UnifiedSnapCandidate[] {
  if (!groupMeshes.length) return [];
  _box.makeEmpty();
  for (const mesh of groupMeshes) {
    mesh.updateMatrixWorld(true);
    setBox3FromObjectExcludingLayoutProxy(_box, mesh);
  }
  if (_box.isEmpty()) return [];

  const center = _box.getCenter(_center);
  const proxy = new THREE.Object3D();
  proxy.position.copy(center);
  proxy.updateMatrixWorld(true);

  const entity: SmartSnapEntity = { kind: "box", id: "group-proxy", mesh: proxy as THREE.Mesh };

  const raw: UnifiedSnapCandidate[] = [];
  for (const other of otherEntities) {
    if (other.id === entity.id && other.kind === entity.kind) continue;
    raw.push(...computeSnapCandidates(entity, other, ctx));
  }
  return raw;
}
