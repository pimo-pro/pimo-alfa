import {
  getDivSepInternalDims,
  resolveDivisorDimensions,
  resolveSeparadorCenterY,
  resolveSeparadorDimensions,
} from "./dimensions";
import type { DivisorItem, DivSepBoxLike, SeparadorItem } from "./types";

export function findSeparadorById(
  box: DivSepBoxLike,
  separadorId: string | undefined
): SeparadorItem | undefined {
  if (!separadorId) return undefined;
  return (box.separadores ?? []).find((s) => s.id === separadorId);
}

export function isDivisorLinkedToSeparador(box: DivSepBoxLike, div: DivisorItem): boolean {
  const sep = findSeparadorById(box, div.linkedSeparadorId);
  return sep != null;
}

/** Face inferior do SEP (mm absolutos, origem = base da caixa). */
export function resolveSeparadorBottomY(box: DivSepBoxLike, sep: SeparadorItem): number {
  const centerY = resolveSeparadorCenterY(box, sep);
  const dims = resolveSeparadorDimensions(box, sep);
  return centerY - dims.alturaMm / 2;
}

/** Folga vertical mínima (mm) entre DIV.top e SEP.bottom (decisão industrial D). */
export const DIV_SEP_VERTICAL_CLEARANCE_MM = 5;

/** Altura do DIV: termina ≥ clearance abaixo da face inferior do SEP ligado. */
export function resolveDivisorLinkedHeightMm(
  box: DivSepBoxLike,
  _div: DivisorItem,
  sep: SeparadorItem
): number {
  const internal = getDivSepInternalDims(box);
  const sepBottomY = resolveSeparadorBottomY(box, sep);
  const divBottomY = internal.espessura;
  return Math.max(
    1,
    Math.floor(sepBottomY - divBottomY - DIV_SEP_VERTICAL_CLEARANCE_MM)
  );
}

/** Altura efetiva do DIV (acoplada ao SEP quando `linkedSeparadorId` definido). */
export function resolveDivisorEffectiveHeightMm(box: DivSepBoxLike, div: DivisorItem): number {
  const linkedSep = findSeparadorById(box, div.linkedSeparadorId);
  if (linkedSep) {
    return resolveDivisorLinkedHeightMm(box, div, linkedSep);
  }
  const dims = resolveDivisorDimensions(box, div);
  return dims.alturaMm;
}
