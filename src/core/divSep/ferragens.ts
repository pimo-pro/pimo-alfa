import type { DivSepBoxLike } from "./types";
import { isDivisorLinkedToSeparador } from "./coupling";
import type { DivSepDrillingResult } from "./drilling";

const PER_PIECE_CAVILHAS = 4;
const PER_PIECE_PARAFUSOS = 4;

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

  const hasCombined = divisores.some((d) => isDivisorLinkedToSeparador(box, d));
  if (hasCombined) {
    return drilling.countFerragens();
  }

  return {
    cavilhas10: separadores.length * PER_PIECE_CAVILHAS + divisores.length * PER_PIECE_CAVILHAS,
    parafusos4x50: separadores.length * PER_PIECE_PARAFUSOS + divisores.length * PER_PIECE_PARAFUSOS,
  };
}
