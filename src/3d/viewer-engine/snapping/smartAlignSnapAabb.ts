import * as THREE from "three";
import { getWorldAabb } from "../commands/alignmentCommands";
import { setBox3FromObjectExcludingLayoutProxy } from "../box/boxAabbUtils";
import type { BoxAabb } from "./smartSnappingTypes";
import type { SmartSnapEntityKind } from "./smartAlignSnapTypes";

const _box = new THREE.Box3();

export function worldBoundsToBoxAabb(bounds: { min: THREE.Vector3; max: THREE.Vector3 }): BoxAabb {
  const center = new THREE.Vector3().addVectors(bounds.min, bounds.max).multiplyScalar(0.5);
  return {
    min: bounds.min.clone(),
    max: bounds.max.clone(),
    center,
  };
}

/** Caixas: proxy de layout (L×A×P). Remates/rodapés: AABB visual. */
export function getEntityWorldBoxAabb(mesh: THREE.Object3D, kind: SmartSnapEntityKind): BoxAabb {
  if (kind === "box") {
    return worldBoundsToBoxAabb(getWorldAabb(mesh));
  }
  mesh.updateMatrixWorld(true);
  setBox3FromObjectExcludingLayoutProxy(_box, mesh);
  return worldBoundsToBoxAabb({ min: _box.min, max: _box.max });
}
