/**
 * Comandos de alinhamento por bounding box (mundo).
 * O primeiro objeto da lista é a referência; os restantes alinham-se a ele.
 * Independente do Smart Align & Snap.
 */

import * as THREE from "three";
import { setBox3FromObjectExcludingLayoutProxy } from "../box/boxAabbUtils";

export type AlignmentType = "right" | "left" | "front" | "back" | "top" | "bottom";

export type AlignableObject = {
  kind: "box" | "remate" | "rodape";
  id: string;
  mesh: THREE.Object3D;
  locked?: boolean;
};

export type WorldAabb = {
  min: THREE.Vector3;
  max: THREE.Vector3;
};

const _bounds = new THREE.Box3();

export function getWorldAabb(mesh: THREE.Object3D): WorldAabb {
  mesh.updateMatrixWorld(true);
  setBox3FromObjectExcludingLayoutProxy(_bounds, mesh);
  return { min: _bounds.min.clone(), max: _bounds.max.clone() };
}

function deltaForAlignment(moving: WorldAabb, reference: WorldAabb, type: AlignmentType): THREE.Vector3 {
  const delta = new THREE.Vector3();
  switch (type) {
    case "right":
      delta.x = reference.max.x - moving.max.x;
      break;
    case "left":
      delta.x = reference.min.x - moving.min.x;
      break;
    case "front":
      delta.z = reference.max.z - moving.max.z;
      break;
    case "back":
      delta.z = reference.min.z - moving.min.z;
      break;
    case "top":
      delta.y = reference.max.y - moving.max.y;
      break;
    case "bottom":
      delta.y = reference.min.y - moving.min.y;
      break;
    default:
      break;
  }
  return delta;
}

export function alignRight(selected: readonly AlignableObject[]): boolean {
  return applyAlignment("right", selected);
}

export function alignLeft(selected: readonly AlignableObject[]): boolean {
  return applyAlignment("left", selected);
}

export function alignFront(selected: readonly AlignableObject[]): boolean {
  return applyAlignment("front", selected);
}

export function alignBack(selected: readonly AlignableObject[]): boolean {
  return applyAlignment("back", selected);
}

export function alignTop(selected: readonly AlignableObject[]): boolean {
  return applyAlignment("top", selected);
}

export function alignBottom(selected: readonly AlignableObject[]): boolean {
  return applyAlignment("bottom", selected);
}

/** Alinha todos os objetos (exceto o primeiro) à face indicada do objeto de referência. */
export function applyAlignment(type: AlignmentType, selected: readonly AlignableObject[]): boolean {
  if (selected.length < 2) return false;

  const reference = selected[0]!;
  if (reference.locked) return false;

  const refAabb = getWorldAabb(reference.mesh);
  let applied = false;

  for (let i = 1; i < selected.length; i += 1) {
    const target = selected[i]!;
    if (target.locked) continue;

    const movingAabb = getWorldAabb(target.mesh);
    const delta = deltaForAlignment(movingAabb, refAabb, type);
    if (delta.lengthSq() < 1e-14) continue;

    target.mesh.position.add(delta);
    applied = true;
  }

  return applied;
}
