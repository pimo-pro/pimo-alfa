import { defaultMaterialSet, mergeMaterialSet } from "../../materials/MaterialLibrary";
import type { MaterialSet } from "../../materials/MaterialLibrary";

export function createInitialMaterialSet(): MaterialSet {
  return mergeMaterialSet(defaultMaterialSet);
}

export function mergeViewerMaterialSet(
  current: MaterialSet,
  materialConfig?: MaterialSet
): MaterialSet {
  return mergeMaterialSet(current, materialConfig);
}
