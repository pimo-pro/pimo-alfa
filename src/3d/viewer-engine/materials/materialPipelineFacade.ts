import type { LoadedWoodMaterial } from "../../materials/WoodMaterial";
import type { ViewerMaterialQuality } from "../../../context/projectTypes";
import {
  getMaterialMode,
  getSceneMaterialConfig,
  setLacqueredClearcoatPipeline,
  setMaterialMode,
} from "./MaterialEngine";
import {
  disposeSharedPanelEdgeMaterial,
  getSharedPanelEdgeMaterial,
} from "./overlayMaterials";
import type { MaterialMode } from "./types";
import { loadViewerMaterial } from "./materialLoadFacade";

export type MaterialPipelineFacade = {
  loadMaterial: (
    materialName: string,
    materialQuality: ViewerMaterialQuality
  ) => LoadedWoodMaterial | null;
  getMaterialMode: () => MaterialMode;
  setMaterialMode: (mode: MaterialMode) => void;
  setLacqueredClearcoatPipeline: (enabled: boolean) => void;
  getSceneMaterialConfig: typeof getSceneMaterialConfig;
  getSharedPanelEdgeMaterial: typeof getSharedPanelEdgeMaterial;
  disposeSharedPanelEdgeMaterial: typeof disposeSharedPanelEdgeMaterial;
};

/** Facade fina do pipeline de materiais do viewer (load, modo, edge material). */
export function createMaterialPipelineFacade(): MaterialPipelineFacade {
  return {
    loadMaterial: (materialName, materialQuality) =>
      loadViewerMaterial(materialName, { materialQuality }),
    getMaterialMode,
    setMaterialMode,
    setLacqueredClearcoatPipeline,
    getSceneMaterialConfig,
    getSharedPanelEdgeMaterial,
    disposeSharedPanelEdgeMaterial,
  };
}
