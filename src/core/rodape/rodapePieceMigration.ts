import type { WorkspaceBox } from "../types";
import { getStructuralBoundsM } from "../remate/rematePlacement";
import { computeRodapePlacementLocal } from "./rodapePlacement";
import type { ProjectRodape } from "./rodapeTypes";
import {
  markRodapePlacementSettled,
  rodapeTransformFromPlacementLocal,
} from "./rodapeTransformStability";

function boxDimsFromWorkspace(box: WorkspaceBox) {
  return {
    widthM: Math.max(0.001, (box.dimensoes?.largura ?? 600) / 1000),
    heightM: Math.max(0.001, (box.dimensoes?.altura ?? 720) / 1000),
    depthM: Math.max(0.001, (box.dimensoes?.profundidade ?? 600) / 1000),
  };
}

function upgradeRodapePiece(rodape: ProjectRodape, box: WorkspaceBox | null): ProjectRodape {
  if (rodape.transform || rodape.placementFree) {
    return markRodapePlacementSettled(rodape);
  }
  if (box) {
    const dims = boxDimsFromWorkspace(box);
    const bounds = getStructuralBoundsM(dims.widthM, dims.heightM, dims.depthM);
    const local = computeRodapePlacementLocal(rodape, bounds, true);
    return markRodapePlacementSettled({
      ...rodape,
      transform: rodapeTransformFromPlacementLocal(local),
    });
  }
  return markRodapePlacementSettled(rodape);
}

export function upgradeRodapesAfterLoad(
  rodapes: ProjectRodape[],
  workspaceBoxes: readonly WorkspaceBox[]
): ProjectRodape[] {
  return rodapes.map((rodape) => {
    const box = rodape.parentBoxId
      ? workspaceBoxes.find((b) => b.id === rodape.parentBoxId) ?? null
      : null;
    return upgradeRodapePiece(rodape, box);
  });
}
