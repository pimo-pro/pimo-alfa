/**
 * geometry/ — Geometria pura do Sistema Europeu (Modelo B).
 */

import type {
  DrawerEuropeanModel,
  DrawerGeometry,
  DrawerPieceBox,
  EuropeanDrawerBoxConfig,
  EuropeanDrawerBoxInput,
} from "../types";
import {
  calcBackHeightMm,
  calcBackWidthMm,
  calcBottomDepthMm,
  calcBottomWidthMm,
  calcDrawerInternalWidthMm,
  calcFrontHeightMm,
  calcFrontWidthMm,
  pickRunnerDepthMm,
} from "../measures";

function emptyPiece(): DrawerPieceBox {
  return {
    widthMm: 0,
    heightMm: 0,
    depthMm: 0,
    thicknessMm: 0,
    originXMm: 0,
    originYMm: 0,
    originZMm: 0,
  };
}

/**
 * Calcula geometria completa de uma gaveta europeia no sistema local do modulo.
 * Origem: centro do modulo (X), base da gaveta (Y), face frontal externa (Z+).
 */
export function buildEuropeanDrawerGeometry(
  box: EuropeanDrawerBoxInput,
  model: DrawerEuropeanModel,
  config: EuropeanDrawerBoxConfig,
  stackIndex: number,
  stackCount: number
): DrawerGeometry {
  const runnerDepthMm = pickRunnerDepthMm(
    model,
    config.depthMm,
    box.dimensoes.profundidade,
    box.espessura
  );
  const internalWidthMm = calcDrawerInternalWidthMm(box, model);
  const usefulHeightMm = config.heightMm;
  const frontThickness = model.recommendedFrontThicknessMm;
  const bottomThickness = model.recommendedBottomThicknessMm;

  const frontW = calcFrontWidthMm(box);
  const frontH = calcFrontHeightMm(usefulHeightMm);
  const bottomW = calcBottomWidthMm(internalWidthMm);
  const bottomD = calcBottomDepthMm(runnerDepthMm);

  // Empilhamento vertical a partir da base util (offset 41 mm tipico + gaps).
  const baseOffsetMm = 41;
  const gapMm = 6;
  const totalStack = stackCount * usefulHeightMm + Math.max(0, stackCount - 1) * gapMm;
  const startY = -box.dimensoes.altura / 2 + box.espessura + baseOffsetMm;
  const yCenter =
    startY + usefulHeightMm / 2 + stackIndex * (usefulHeightMm + gapMm);

  void totalStack;

  const front: DrawerPieceBox = {
    widthMm: frontW,
    heightMm: frontH,
    depthMm: frontThickness,
    thicknessMm: frontThickness,
    originXMm: 0,
    originYMm: yCenter,
    originZMm: box.dimensoes.profundidade / 2 + frontThickness / 2,
  };

  const bottom: DrawerPieceBox = {
    widthMm: bottomW,
    heightMm: bottomThickness,
    depthMm: bottomD,
    thicknessMm: bottomThickness,
    originXMm: 0,
    originYMm: yCenter - usefulHeightMm / 2 + bottomThickness / 2,
    originZMm: box.dimensoes.profundidade / 2 - frontThickness - bottomD / 2 - 5,
  };

  const back: DrawerPieceBox = {
    widthMm: calcBackWidthMm(internalWidthMm),
    heightMm: calcBackHeightMm(usefulHeightMm, bottomThickness),
    depthMm: model.side.wallThicknessMm,
    thicknessMm: model.side.wallThicknessMm,
    originXMm: 0,
    originYMm: yCenter + bottomThickness / 4,
    originZMm: bottom.originZMm - bottomD / 2,
  };

  // Caixa metalica: laterais madeira a zero (compensacao de montagem no metal).
  const leftSide = emptyPiece();
  const rightSide = emptyPiece();

  return {
    systemId: model.id,
    front,
    bottom,
    leftSide,
    rightSide,
    back,
    internalWidthMm,
    usefulHeightMm,
    runnerDepthMm,
  };
}

/** Altura util disponivel no modulo para empilhar gavetas. */
export function calcUsefulCabinetHeightMm(box: EuropeanDrawerBoxInput): number {
  return Math.max(0, box.dimensoes.altura - 2 * box.espessura - 41 - 10);
}

/** Tolerancias industriais documentadas. */
export function getIndustrialTolerances(model: DrawerEuropeanModel) {
  return {
    assemblyMm: model.assembly.toleranceMm,
    frontGapMm: model.assembly.frontGapMm,
    sideClearanceMm: model.side.clearanceMm,
  };
}
