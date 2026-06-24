import * as THREE from "three";
import type { LoadedWoodMaterial } from "../../materials/WoodMaterial";

export function isDoorOrDrawerFrontNode(node: THREE.Object3D): boolean {
  const ud = (node as THREE.Mesh & {
    userData: { doorLayerId?: string; drawerPart?: string };
  }).userData;
  return ud?.doorLayerId != null || ud?.drawerPart === "front";
}

export function isKitchenFeetNode(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (current.userData?.isKitchenFeet === true || current.name === "kitchen-feet-group") {
      return true;
    }
    current = current.parent;
  }
  return false;
}

export function disposeLoadedWoodMaterial(loaded: LoadedWoodMaterial | null | undefined): void {
  if (!loaded) return;
  loaded.material.dispose();
  loaded.textures.forEach((texture) => texture.dispose());
}
