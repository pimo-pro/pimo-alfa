import type { WorkspaceBox } from "../types";
import type { CornerOrientation } from "./cornerCabinetRules";
import { isCornerDireitaInferiorV2Model } from "./cornerCabinetRules";
import { syncCornerWorkspaceBoxDoorsLayer } from "./cornerCabinetLayers";

/** Aplica orientação canto v2 e regenera doorsLayer derivado do layout. */
export function applyCornerOrientationToBox<T extends WorkspaceBox>(
  box: T,
  orientation: CornerOrientation
): T {
  if (!isCornerDireitaInferiorV2Model(box.baseCabinetId)) {
    return box;
  }
  return syncCornerWorkspaceBoxDoorsLayer({ ...box, orientation });
}

export function resolveCornerOrientationLabel(orientation: CornerOrientation): string {
  return orientation === "esquerda" ? "Esquerda" : "Direita";
}
