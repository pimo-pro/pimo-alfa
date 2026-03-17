// Hook para seleção de materiais.
// Expõe funções para selecionar material, listar opções, etc.

import { useMemo } from "react";
import type { ProjectState } from "../context/projectTypes";
import type { Material } from "../core/types";

export function useMaterialSelection(project: ProjectState) {
  // FASE 5: Seleção real de material
  return useMemo(() => ({
    selectedMaterial: project.material,
    selectMaterial: (_material: Material) => {
      // TODO: Implementar seleção real de material (via actions quando disponível)
      throw new Error("Not implemented yet: select material through project actions");
    },
    listMaterials: () => {
      // TODO: Retornar lista real de materiais
      throw new Error("Not implemented yet: list available materials from material catalog");
    },
  }), [project]);
}
