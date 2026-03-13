// Hook para seleção de materiais.
// Expõe funções para selecionar material, listar opções, etc.

import { useMemo } from "react";
import type { ProjectState } from "../context/projectTypes";
import type { Material } from "../core/types";

export function useMaterialSelection(project: ProjectState) {
  // FASE 5: Seleção real de material
  return useMemo(() => ({
    selectedMaterial: project.material,
    selectMaterial: (material: Material) => {
      // TODO: Implementar seleção real de material
      project.material = material;
      return material;
    },
    listMaterials: () => {
      // TODO: Retornar lista real de materiais
      return [project.material];
    },
  }), [project]);
}
