/**
 * european/placement  Posicionamento 3D do Modelo B (offsets industriais).
 * Converte origens absolutas (mdulo) ? locais (grupo da gaveta = centro da frente),
 * no mesmo padro do Modelo A (DrawerFactory / drawerViewerLayout).
 * No altera geometry/furos/cutlist  s coordenadas de viewer.
 */

import {
  DRAWER_VERTICAL_BASE_OFFSET_MM,
  DRAWER_VERTICAL_GAP_MM,
  resolveDrawerVerticalPosition,
} from "../../drawerVerticalPosition";
import { resolveDrawerGroupPosZMm } from "../../drawerViewerLayout";
import type { DrawerGeometry, DrawerPieceBox } from "../types";

export type Vec3Mm = { xMm: number; yMm: number; zMm: number };

/** Empilhamento europeu (geometry SSOT)  base 41 mm, gap 6 mm. */
const EUROPEAN_BASE_OFFSET_MM = 41;
const EUROPEAN_STACK_GAP_MM = 6;

export function pieceOriginMm(piece: DrawerPieceBox): Vec3Mm {
  return {
    xMm: piece.originXMm,
    yMm: piece.originYMm,
    zMm: piece.originZMm,
  };
}

/** Origem do grupo 3D = centro da frente externa (igual ao Modelo A). */
export function calculateEuropeanDrawerGroupOriginMm(geometry: DrawerGeometry): Vec3Mm {
  return pieceOriginMm(geometry.front);
}

/** Posio local de uma pea relativamente  origem do grupo. */
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
 * Empilhamento vertical europeu (mesma frmula da geometry, s leitura).
 * Retorna o Y do centro til da gaveta no sistema do mdulo.
 */
export function calculateEuropeanVerticalStackMm(params: {
  boxHeightMm: number;
  boxThicknessMm: number;
  usefulHeightMm: number;
  stackIndex: number;
  gapMm?: number;
  baseOffsetMm?: number;
}): number {
  const base = params.baseOffsetMm ?? EUROPEAN_BASE_OFFSET_MM;
  const gap = params.gapMm ?? EUROPEAN_STACK_GAP_MM;
  const startY = -params.boxHeightMm / 2 + params.boxThicknessMm + base;
  return startY + params.usefulHeightMm / 2 + params.stackIndex * (params.usefulHeightMm + gap);
}

/**
 * Empilhamento vertical alinhado ao Modelo A (SSOT drawerVerticalPosition).
 * til para comparar / validar bounding box; geometry europeia mantm a sua frmula.
 */
export function calculateModeloAAlignedVerticalStackMm(params: {
  drawerHeightsMm: number[];
  boxInternalHeightMm: number;
  stackIndex: number;
  baseOffsetMm?: number;
}): number {
  return resolveDrawerVerticalPosition(
    params.stackIndex,
    params.drawerHeightsMm,
    params.boxInternalHeightMm,
    params.baseOffsetMm ?? DRAWER_VERTICAL_BASE_OFFSET_MM
  );
}

/** Z do grupo (frente flush)  mesma regra do Modelo A. */
export function calculateModeloAAlignedGroupPosZMm(
  boxExternalDepthMm: number,
  frontThicknessMm: number
): number {
  return resolveDrawerGroupPosZMm(boxExternalDepthMm, frontThicknessMm);
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

/** Mapa completo de peas em coordenadas locais do grupo. */
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

/** Valida que o grupo + peas cabem no bounding box do mdulo (metros ou mm). */
export function isEuropeanDrawerInsideBoxMm(params: {
  groupYMm: number;
  frontHeightMm: number;
  boxHeightMm: number;
  bottomLocalYMm: number;
}): boolean {
  const halfH = params.boxHeightMm / 2;
  const frontBottom = params.groupYMm - params.frontHeightMm / 2;
  const frontTop = params.groupYMm + params.frontHeightMm / 2;
  const pieceFloor = params.groupYMm + params.bottomLocalYMm;
  return (
    frontBottom > -halfH - 0.5 &&
    frontTop < halfH + 0.5 &&
    pieceFloor > -halfH - 0.5
  );
}

/** API de produto pedida pelo binding 3D. */
export const drawerEuropeanPlacement = {
  calculatePosition: calculateEuropeanPieceLocalMm,
  calculateVerticalStack: calculateEuropeanVerticalStackMm,
  calculateVerticalStackAlignedWithModeloA: calculateModeloAAlignedVerticalStackMm,
  calculateGroupOrigin: calculateEuropeanDrawerGroupOriginMm,
  calculateGroupPosZAlignedWithModeloA: calculateModeloAAlignedGroupPosZMm,
  buildLocalPieceMap: buildEuropeanLocalPieceMapMm,
  isInsideBox: isEuropeanDrawerInsideBoxMm,
  MODELO_A_BASE_OFFSET_MM: DRAWER_VERTICAL_BASE_OFFSET_MM,
  MODELO_A_GAP_MM: DRAWER_VERTICAL_GAP_MM,
  EUROPEAN_BASE_OFFSET_MM,
  EUROPEAN_STACK_GAP_MM,
};

export default drawerEuropeanPlacement;
