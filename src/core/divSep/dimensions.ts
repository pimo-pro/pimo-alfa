import { getProfundidadeInternaUtilMm } from "../box/boxDepthHelpers";
import { resolveCostaThicknessMm } from "../materials/materials.api";
import type { DivisorItem, DivSepBoxLike, SeparadorItem } from "./types";

const SHELF_WIDTH_CLEARANCE_MM = 2;
const SHELF_DEPTH_CLEARANCE_MM = 5;

export type DivSepInternalDims = {
  larguraInterna: number;
  alturaInterna: number;
  profundidadeInterna: number;
  espessura: number;
};

export function getDivSepInternalDims(box: DivSepBoxLike): DivSepInternalDims {
  const espessura = Math.max(1, Number(box.espessura) || 19);
  const largura = Number(box.dimensoes.largura) || 0;
  const altura = Number(box.dimensoes.altura) || 0;
  const profundidadeExterna = Number(box.profundidadeExterna ?? box.dimensoes.profundidade) || 0;
  const espessuraCostaMm = resolveCostaThicknessMm(box as Parameters<typeof resolveCostaThicknessMm>[0]);
  const profundidadeInterna = getProfundidadeInternaUtilMm(
    {
      dimensoes: { profundidade: profundidadeExterna },
      espessura,
      portaTipo: box.portaTipo as "sem_porta" | "porta_simples" | "porta_dupla" | "porta_correr" | undefined,
      doorsLayer: box.doorsLayer as { width?: number }[] | undefined,
      drawersLayer: box.drawersLayer as { frontThickness?: number }[] | undefined,
      gavetas: box.gavetas,
      costaAtiva: box.costaAtiva,
    },
    espessuraCostaMm
  );
  return {
    larguraInterna: Math.max(0, largura - espessura * 2),
    alturaInterna: Math.max(0, altura - espessura * 2),
    profundidadeInterna: Math.max(0, profundidadeInterna),
    espessura,
  };
}

export function resolveDivisorDimensions(
  box: DivSepBoxLike,
  item: DivisorItem
): { larguraMm: number; alturaMm: number; profundidadeMm: number } {
  const internal = getDivSepInternalDims(box);
  return {
    larguraMm: internal.espessura,
    alturaMm: item.alturaMm ?? internal.alturaInterna,
    profundidadeMm: item.profundidadeMm ?? Math.max(1, internal.profundidadeInterna - SHELF_DEPTH_CLEARANCE_MM),
  };
}

export function resolveSeparadorDimensions(
  box: DivSepBoxLike,
  item: SeparadorItem
): { larguraMm: number; alturaMm: number; profundidadeMm: number } {
  const internal = getDivSepInternalDims(box);
  return {
    larguraMm: item.larguraMm ?? Math.max(1, internal.larguraInterna - SHELF_WIDTH_CLEARANCE_MM),
    alturaMm: internal.espessura,
    profundidadeMm: item.profundidadeMm ?? Math.max(1, internal.profundidadeInterna - SHELF_DEPTH_CLEARANCE_MM),
  };
}

/** Centro X absoluto do divisório (mm, origem = canto inferior-esquerdo-frontal da caixa). */
export function resolveDivisorCenterX(box: DivSepBoxLike, item: DivisorItem): number {
  const internal = getDivSepInternalDims(box);
  const dims = resolveDivisorDimensions(box, item);
  const pos = Math.max(0, Number(item.positionMm) || 0);
  const minX = internal.espessura + dims.larguraMm / 2;
  const maxX = internal.espessura + internal.larguraInterna - dims.larguraMm / 2;
  if (item.referenceEdge === "right") {
    const fromRight = internal.espessura + internal.larguraInterna - pos;
    return Math.min(maxX, Math.max(minX, fromRight));
  }
  const fromLeft = internal.espessura + pos;
  return Math.min(maxX, Math.max(minX, fromLeft));
}

/** Centro Y absoluto do separador (mm, origem = base da caixa). */
export function resolveSeparadorCenterY(box: DivSepBoxLike, item: SeparadorItem): number {
  const internal = getDivSepInternalDims(box);
  const dims = resolveSeparadorDimensions(box, item);
  const pos = Math.max(0, Number(item.positionMm) || 0);
  const minY = internal.espessura + dims.alturaMm / 2;
  const maxY = internal.espessura + internal.alturaInterna - dims.alturaMm / 2;
  if (item.referenceEdge === "top") {
    const alturaTotal = Number(box.dimensoes.altura) || 0;
    const fromTop = alturaTotal - internal.espessura - pos;
    return Math.min(maxY, Math.max(minY, fromTop));
  }
  const fromBottom = internal.espessura + pos;
  return Math.min(maxY, Math.max(minY, fromBottom));
}

export function clampDivisorPosition(box: DivSepBoxLike, item: DivisorItem, positionMm: number): number {
  const internal = getDivSepInternalDims(box);
  const dims = resolveDivisorDimensions(box, item);
  const half = dims.larguraMm / 2;
  const minPos = half;
  const maxPos = internal.larguraInterna - half;
  return Math.min(maxPos, Math.max(minPos, positionMm));
}

export function clampSeparadorPosition(box: DivSepBoxLike, item: SeparadorItem, positionMm: number): number {
  const internal = getDivSepInternalDims(box);
  const dims = resolveSeparadorDimensions(box, item);
  const half = dims.alturaMm / 2;
  const minPos = half;
  const maxPos = internal.alturaInterna - half;
  return Math.min(maxPos, Math.max(minPos, positionMm));
}
