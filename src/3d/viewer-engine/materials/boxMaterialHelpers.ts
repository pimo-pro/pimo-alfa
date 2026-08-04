import * as THREE from "three";
import type { LoadedWoodMaterial } from "../../materials/WoodMaterial";
import { isDrawerFrontExteriorMesh } from "./drawerFrontMaterialTrace";

export function isDoorOrDrawerFrontNode(node: THREE.Object3D): boolean {
  const ud = (node as THREE.Mesh & {
    userData: {
      doorLayerId?: string;
      drawerPart?: string;
      isDrawerFrontExteriorCap?: boolean;
    };
  }).userData;
  if (ud?.doorLayerId != null) return true;
  // Frente exterior da gaveta: nunca receber matéria do módulo (updateBoxMaterial).
  if (isDrawerFrontExteriorMesh(node)) return true;
  return false;
}

/**
 * Mesh auxiliar legado drawer-click-* (película 2 mm).
 * Nunca deve receber matéria do módulo nem participar no picking visual.
 */
export function isDrawerClickTargetGhost(node: THREE.Object3D): boolean {
  const part = (node.userData as { drawerPart?: string } | undefined)?.drawerPart;
  if (part === "click-target") return true;
  const name = typeof node.name === "string" ? node.name : "";
  return name.startsWith("drawer-click-");
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
