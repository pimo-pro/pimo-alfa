import type * as THREE from "three";
import type { RemateSnapPlane } from "./remateSnapTargets";
import type { BoxAabb } from "./smartSnappingTypes";
import type { SmartSnapEntity } from "./smartAlignSnapTypes";

type AabbEntry = { version: number; aabb: BoxAabb };

/**
 * Cache leve para snapping unificado — invalidação por versão de mesh.
 * Complementa ViewerBoundsCache (sala) sem alterá-lo.
 */
export class SmartAlignSnapCache {
  private globalGeneration = 0;
  private readonly meshVersions = new Map<string, number>();
  private readonly aabbCache = new Map<string, AabbEntry>();
  private readonly structuralPlanes = new Map<string, { gen: number; planes: RemateSnapPlane[] }>();
  private readonly rodapePlacement = new Map<string, { gen: number; world: THREE.Vector3 }>();
  private readonly neighbors = new Map<string, { gen: number; list: SmartSnapEntity[] }>();

  invalidateAll(): void {
    this.globalGeneration += 1;
    this.aabbCache.clear();
    this.structuralPlanes.clear();
    this.rodapePlacement.clear();
    this.neighbors.clear();
  }

  touchMesh(mesh: THREE.Object3D): void {
    const key = mesh.uuid;
    this.meshVersions.set(key, (this.meshVersions.get(key) ?? 0) + 1);
  }

  getMeshVersion(mesh: THREE.Object3D): number {
    return this.meshVersions.get(mesh.uuid) ?? 0;
  }

  getWorldAabb(mesh: THREE.Object3D, compute: () => BoxAabb): BoxAabb {
    const key = mesh.uuid;
    const version = this.getMeshVersion(mesh);
    const cached = this.aabbCache.get(key);
    if (cached && cached.version === version) return cached.aabb;
    const aabb = compute();
    this.aabbCache.set(key, { version, aabb });
    return aabb;
  }

  getStructuralPlanes(boxId: string, compute: () => RemateSnapPlane[]): RemateSnapPlane[] {
    const cached = this.structuralPlanes.get(boxId);
    if (cached && cached.gen === this.globalGeneration) return cached.planes;
    const planes = compute();
    this.structuralPlanes.set(boxId, { gen: this.globalGeneration, planes });
    return planes;
  }

  getRodapePlacementWorld(key: string, compute: () => THREE.Vector3): THREE.Vector3 {
    const version = this.meshVersions.get(key) ?? 0;
    const cached = this.rodapePlacement.get(key);
    if (cached && cached.gen === version) return cached.world.clone();
    const world = compute();
    this.rodapePlacement.set(key, { gen: version, world: world.clone() });
    return world;
  }

  getNeighbors(
    entityKey: string,
    all: SmartSnapEntity[],
    compute: () => SmartSnapEntity[]
  ): SmartSnapEntity[] {
    const cached = this.neighbors.get(entityKey);
    if (cached && cached.gen === this.globalGeneration) return cached.list;
    const list = compute();
    this.neighbors.set(entityKey, { gen: this.globalGeneration, list });
    void all;
    return list;
  }
}
