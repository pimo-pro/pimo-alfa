import type { ViewerMaterialQuality } from "../../../context/projectTypes";
import type { LoadedWoodMaterial } from "../../materials/WoodMaterial";
import {
  getMaterialMode,
  loadMaterial as materialEngineLoadMaterial,
} from "./MaterialEngine";

export type MaterialLoadContext = {
  materialQuality: ViewerMaterialQuality;
};

/** Carrega material de caixa via MaterialEngine com contexto de qualidade do viewer. */
export function loadViewerMaterial(
  materialName: string,
  context: MaterialLoadContext
): LoadedWoodMaterial | null {
  const result = materialEngineLoadMaterial(materialName, getMaterialMode(), {
    useLacqueredClearcoat: context.materialQuality === "lacquered",
  });
  return result as LoadedWoodMaterial | null;
}
