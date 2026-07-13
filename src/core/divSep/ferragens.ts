import type { DivSepBoxLike } from "./types";
import type { DivSepDrillingResult } from "./drilling";

export type DivSepFerragensCount = {
  cavilhas10: number;
  parafusos4x50: number;
};

export function countDivSepFerragens(
  box: DivSepBoxLike,
  drilling: DivSepDrillingResult
): DivSepFerragensCount {
  const separadores = box.separadores ?? [];
  const divisores = box.divisores ?? [];
  if (separadores.length === 0 && divisores.length === 0) {
    return { cavilhas10: 0, parafusos4x50: 0 };
  }

  return drilling.countFerragens();
}
