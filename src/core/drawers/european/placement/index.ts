/**
 * european/placement —Posicionamento 3D do Modelo B (offsets industriais).
 * Converte origens absolutas (módulo) ? locais (grupo da gaveta = centro da frente).
 * Não altera geometry/furos/cutlist —sócoordenadas de viewer.
 */

import type { DrawerGeometry, DrawerPieceBox } from "../types";

export type Vec3Mm = { xMm: number; yMm: number; zMm: number };

const BASE_OFFSET_MM = 41;
const STACK_GAP_MM = 6;

export function pieceOriginMm(piece: DrawerPieceBox): Vec3Mm {
  return {
    xMm: piece.originXMm,
    yMm: piece.originYMm,
    zMm: piece.originZMm,
  };
}

/** Origem do grupo 3D = centro da frente externa (sistema europeu). */
export function calculateEuropeanDrawerGroupOriginMm(geometry: DrawerGeometry): Vec3Mm {
  return pieceOriginMm(geometry.front);
}

/** Posição local de uma peça relativamente —origem do grupo. */
export function calculateEuropeanPieceLocalMm(
  pieceOrigin: Vec3Mm,
  groupOrigin: Vec3Mm
): Vec3Mm {
  return {
    xMm: pieceOrigin.xMm - groupOrigin.xMm,
    yMm: pieceOrigin.yMm - groupOrigin.yMm,
    zMm: pieceOrigin.zMm - groupOrigin.zMm,
  };
}

/**
 * Empilhamento vertical europeu (mesma fórmula da geometry, sóleitura).
 * Retorna o Y do centro útil da gaveta no sistema do módulo.
 */
export function calculateEuropeanVerticalStackMm(params: {
  boxHeightMm: number;
  boxThicknessMm: number;
  usefulHeightMm: number;
  stackIndex: number;
  gapMm?: number;
  baseOffsetMm?: number;
}): number {
  const base = params.baseOffsetMm ?? BASE_OFFSET_MM;
  const gap = params.gapMm ?? STACK_GAP_MM;
  const startY = -params.boxHeightMm / 2 + params.boxThicknessMm + base;
  return startY + params.usefulHeightMm / 2 + params.stackIndex * (params.usefulHeightMm + gap);
}

export type EuropeanLocalPieceMapMm = {
  group: Vec3Mm;
  front: Vec3Mm;
  frontInt?: Vec3Mm;
  leftSide: Vec3Mm;
  rightSide: Vec3Mm;
  bottom: Vec3Mm;
  back: Vec3Mm;
};

/** Mapa completo de peças em coordenadas locais do grupo. */
export function buildEuropeanLocalPieceMapMm(geometry: DrawerGeometry): EuropeanLocalPieceMapMm {
  const group = calculateEuropeanDrawerGroupOriginMm(geometry);
  const local = (piece: DrawerPieceBox) =>
    calculateEuropeanPieceLocalMm(pieceOriginMm(piece), group);
  return {
    group,
    front: local(geometry.front),
    frontInt: geometry.frontInt ? local(geometry.frontInt) : undefined,
    leftSide: local(geometry.leftSide),
    rightSide: local(geometry.rightSide),
    bottom: local(geometry.bottom),
    back: local(geometry.back),
  };
}

/** API de produto pedida pelo binding 3D. */
export const drawerEuropeanPlacement = {
  calculatePosition: calculateEuropeanPieceLocalMm,
  calculateVerticalStack: calculateEuropeanVerticalStackMm,
  calculateGroupOrigin: calculateEuropeanDrawerGroupOriginMm,
  buildLocalPieceMap: buildEuropeanLocalPieceMapMm,
};

export default drawerEuropeanPlacement;
