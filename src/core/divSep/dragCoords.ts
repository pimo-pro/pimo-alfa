import {
  clampDivisorPosition,
  clampSeparadorPosition,
  resolveDivisorCenterX,
  resolveSeparadorCenterY,
} from "./dimensions";
import type { DivSepBoxLike, DivisorItem, SeparadorItem } from "./types";

export type DivSepDragKind = "div" | "sep";

/** Extrai tipo e id a partir do nome da mesh (`divsep-div-{id}` / `divsep-sep-{id}`). */
export function parseDivSepMeshName(name: string): { kind: DivSepDragKind; itemId: string } | null {
  const match = /^divsep-(div|sep)-(.+)$/.exec(name);
  if (!match) return null;
  return { kind: match[1] as DivSepDragKind, itemId: match[2]! };
}

/** Centro Y local (m) → positionMm do separador (com clamp). */
export function separadorLocalYToPositionMm(
  localYM: number,
  heightM: number,
  box: DivSepBoxLike,
  item: SeparadorItem
): number {
  const centerYAbs = (localYM + heightM / 2) * 1000;
  const espessura = Math.max(1, Number(box.espessura) || 19);
  const alturaTotal = Number(box.dimensoes.altura) || 0;
  const positionMm =
    item.referenceEdge === "top"
      ? alturaTotal - espessura - centerYAbs
      : centerYAbs - espessura;
  return clampSeparadorPosition(box, item, positionMm);
}

/** Centro X local (m) → positionMm do divisório (com clamp). */
export function divisorLocalXToPositionMm(
  localXM: number,
  widthM: number,
  box: DivSepBoxLike,
  item: DivisorItem
): number {
  const centerXAbs = (localXM + widthM / 2) * 1000;
  const espessura = Math.max(1, Number(box.espessura) || 19);
  const largura = Number(box.dimensoes.largura) || 0;
  const larguraInterna = Math.max(0, largura - espessura * 2);
  const positionMm =
    item.referenceEdge === "right"
      ? espessura + larguraInterna - centerXAbs
      : centerXAbs - espessura;
  return clampDivisorPosition(box, item, positionMm);
}

/** Limita Y local do separador ao interior da caixa. */
export function clampSeparadorLocalY(
  localYM: number,
  heightM: number,
  box: DivSepBoxLike,
  item: SeparadorItem
): number {
  const positionMm = separadorLocalYToPositionMm(localYM, heightM, box, item);
  const centerYAbs = resolveSeparadorCenterY(box, { ...item, positionMm });
  return centerYAbs / 1000 - heightM / 2;
}

/** Limita X local do divisório ao interior da caixa. */
export function clampDivisorLocalX(
  localXM: number,
  widthM: number,
  box: DivSepBoxLike,
  item: DivisorItem
): number {
  const positionMm = divisorLocalXToPositionMm(localXM, widthM, box, item);
  const centerXAbs = resolveDivisorCenterX(box, { ...item, positionMm });
  return centerXAbs / 1000 - widthM / 2;
}
