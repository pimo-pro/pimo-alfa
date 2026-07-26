/**
 * geometry/ ù Geometria pura do Sistema Europeu (Modelo B).
 * Corpo em madeira: laterais/costa/fundo + frente externa (sobreposta).
 */

import type {
  DrawerEuropeanModel,
  DrawerGeometry,
  DrawerPieceBox,
  EuropeanDrawerBoxConfig,
  EuropeanDrawerBoxInput,
} from "../types";
import {
  EUROPEAN_BACK_THICKNESS_MM,
  EUROPEAN_BOTTOM_THICKNESS_MM,
  EUROPEAN_FRONT_INT_THICKNESS_MM,
  EUROPEAN_SIDE_CLEARANCE_EACH_MM,
  EUROPEAN_SIDE_THICKNESS_MM,
  calcBackHeightMm,
  calcBackWidthMm,
  calcBodyDepthWithoutFrontMm,
  calcBottomDepthMm,
  calcBottomWidthMm,
  calcDrawerExternalWidthMm,
  calcDrawerInternalWidthMm,
  calcFrontHeightMm,
  calcFrontIntWidthMm,
  calcFrontWidthMm,
  resolveEuropeanUsefulInternalDepthMm,
  selectHettichRunnerDepth,
} from "../measures";
import { memo } from "../perf/memo";

/**
 * Calcula geometria completa de uma gaveta europeia no sistema local do modulo.
 * Origem: centro do modulo (X), base da gaveta (Y), face frontal externa (Z+).
 */
function buildEuropeanDrawerGeometryCore(
  box: EuropeanDrawerBoxInput,
  model: DrawerEuropeanModel,
  config: EuropeanDrawerBoxConfig,
  stackIndex: number,
  stackCount: number
): DrawerGeometry {
  const usefulResolved = resolveEuropeanUsefulInternalDepthMm(box);
  const autoRunner = selectHettichRunnerDepth(usefulResolved);
  const configDepth = Number(config.depthMm);
  const runner =
    Number.isFinite(configDepth) &&
    configDepth > 0 &&
    configDepth < usefulResolved &&
    [300, 350, 400, 450, 500, 550, 600].includes(configDepth)
      ? configDepth
      : autoRunner;

  const externalWidthMm = calcDrawerExternalWidthMm(box);
  const internalWidthMm = calcDrawerInternalWidthMm(box, model);
  const bodyDepthMm = calcBodyDepthWithoutFrontMm(runner);
  const usefulHeightMm = config.heightMm;

  const frontThickness = Math.max(1, box.espessura);
  const bottomThickness = EUROPEAN_BOTTOM_THICKNESS_MM;
  const sideT = EUROPEAN_SIDE_THICKNESS_MM;
  const backT = EUROPEAN_BACK_THICKNESS_MM;
  const hasInnerFront = config.dualFront === true;

  const frontW =
    typeof config.frontWidthMm === "number" && config.frontWidthMm > 0
      ? config.frontWidthMm
      : calcFrontWidthMm(box);
  const frontH =
    typeof config.frontHeightMm === "number" && config.frontHeightMm > 0
      ? config.frontHeightMm
      : calcFrontHeightMm(usefulHeightMm);

  const bottomW = calcBottomWidthMm(externalWidthMm);
  const bottomD = calcBottomDepthMm(bodyDepthMm, { hasInnerFront, backThicknessMm: backT });

  const baseOffsetMm = 41;
  const gapMm = 6;
  const startY = -box.dimensoes.altura / 2 + box.espessura + baseOffsetMm;
  const yCenter = startY + usefulHeightMm / 2 + stackIndex * (usefulHeightMm + gapMm);

  const boxHalfD = box.dimensoes.profundidade / 2;
  // Frente fora da caixa (sobreposta ù estrutura frontal)
  const front: DrawerPieceBox = {
    widthMm: frontW,
    heightMm: frontH,
    depthMm: frontThickness,
    thicknessMm: frontThickness,
    originXMm: 0,
    originYMm: yCenter,
    originZMm: boxHalfD + frontThickness / 2,
  };

  const bodyFrontZ = boxHalfD;
  const bodyCenterZ = bodyFrontZ - bodyDepthMm / 2;

  const sideHeight = usefulHeightMm;
  const sideDepth = bodyDepthMm;
  const sideOriginXHalf = externalWidthMm / 2 - sideT / 2;

  const leftSide: DrawerPieceBox = {
    widthMm: sideT,
    heightMm: sideHeight,
    depthMm: sideDepth,
    thicknessMm: sideT,
    originXMm: -sideOriginXHalf,
    originYMm: yCenter,
    originZMm: bodyCenterZ,
  };

  const rightSide: DrawerPieceBox = {
    widthMm: sideT,
    heightMm: sideHeight,
    depthMm: sideDepth,
    thicknessMm: sideT,
    originXMm: sideOriginXHalf,
    originYMm: yCenter,
    originZMm: bodyCenterZ,
  };

  const backW = calcBackWidthMm(externalWidthMm);
  const backH = calcBackHeightMm(usefulHeightMm, bottomThickness);
  const back: DrawerPieceBox = {
    widthMm: backW,
    heightMm: backH,
    depthMm: backT,
    thicknessMm: backT,
    originXMm: 0,
    originYMm: yCenter - usefulHeightMm / 2 + bottomThickness + backH / 2,
    originZMm: bodyFrontZ - bodyDepthMm + backT / 2,
  };

  const bottomFrontInset = hasInnerFront ? 0 : 10;
  const bottom: DrawerPieceBox = {
    widthMm: bottomW,
    heightMm: bottomThickness,
    depthMm: bottomD,
    thicknessMm: bottomThickness,
    originXMm: 0,
    originYMm: yCenter - usefulHeightMm / 2 + bottomThickness / 2,
    originZMm: bodyFrontZ - bottomFrontInset - bottomD / 2,
  };

  let frontInt: DrawerPieceBox | undefined;
  if (hasInnerFront) {
    const fiW = calcFrontIntWidthMm(box);
    frontInt = {
      widthMm: fiW,
      heightMm: usefulHeightMm,
      depthMm: EUROPEAN_FRONT_INT_THICKNESS_MM,
      thicknessMm: EUROPEAN_FRONT_INT_THICKNESS_MM,
      originXMm: 0,
      originYMm: yCenter,
      originZMm: bodyFrontZ - EUROPEAN_FRONT_INT_THICKNESS_MM / 2,
    };
  }

  void EUROPEAN_SIDE_CLEARANCE_EACH_MM;
  void stackCount;
  void gapMm;

  return {
    systemId: model.id,
    front,
    frontInt,
    bottom,
    leftSide,
    rightSide,
    back,
    externalWidthMm,
    internalWidthMm,
    usefulHeightMm,
    runnerDepthMm: runner,
    bodyDepthMm,
  };
}

/** Geometria memoizada (funÁ„o pura ó transparente). */
export const buildEuropeanDrawerGeometry = memo(buildEuropeanDrawerGeometryCore, {
  namespace: "eu.geometry",
  maxSize: 256,
});

/** Altura util disponivel no modulo para empilhar gavetas. */
export function calcUsefulCabinetHeightMm(box: EuropeanDrawerBoxInput): number {
  return Math.max(0, box.dimensoes.altura - 2 * box.espessura - 41 - 10);
}

/** Tolerancias industriais documentadas. */
export function getIndustrialTolerances(_model: DrawerEuropeanModel) {
  return {
    assemblyMm: 0.5,
    frontGapMm: 1,
    sideClearanceMm: EUROPEAN_SIDE_CLEARANCE_EACH_MM,
  };
}
