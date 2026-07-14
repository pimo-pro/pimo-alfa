import type { FinishTransform } from "../kitchenFinish/finishTypes";
import type { ProjectRodape } from "./rodapeTypes";

export function hasSavedRodapeTransform(rodape: ProjectRodape): boolean {
  if (rodape.isInitialPlacement === true) return false;
  return rodape.transform != null || rodape.placementFree === true;
}

export function shouldComputeRodapePlacementFromBounds(rodape: ProjectRodape): boolean {
  return rodape.isInitialPlacement === true && !rodape.transform;
}

export function markRodapePlacementSettled(rodape: ProjectRodape): ProjectRodape {
  return { ...rodape, isInitialPlacement: false };
}

export function stabilizeRodapeForPersistence(rodape: ProjectRodape): ProjectRodape {
  return markRodapePlacementSettled(rodape);
}

export function rodapeTransformFromPlacementLocal(local: {
  position: [number, number, number];
  rotation: [number, number, number];
}): FinishTransform {
  return {
    xMm: local.position[0] * 1000,
    yMm: local.position[1] * 1000,
    zMm: local.position[2] * 1000,
    rotacaoXRad: local.rotation[0],
    rotacaoYRad: local.rotation[1],
    rotacaoZRad: local.rotation[2],
  };
}
