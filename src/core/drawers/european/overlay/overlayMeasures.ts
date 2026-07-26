/**
 * overlayMeasures.ts — Medidas internas avançadas (somente leitura).
 */

import type { EuropeanDrawerBoxInput, EuropeanDrawerResult } from "../types";
import {
  EUROPEAN_BACK_THICKNESS_MM,
  EUROPEAN_BODY_DEPTH_SLIDE_CLEARANCE_MM,
  EUROPEAN_SIDE_CLEARANCE_EACH_MM,
  EUROPEAN_SIDE_THICKNESS_MM,
  calcBoxInternalWidthMm,
  resolveEuropeanUsefulInternalDepthMm,
} from "../measures";

export type EuropeanOverlayMeasures = {
  /** Largura interna útil do corpo (entre faces internas das laterais). */
  internalUsefulWidthMm: number;
  /** Profundidade interna útil (runner ? corpo, sem frente). */
  internalUsefulDepthMm: number;
  /** Altura útil por gaveta (sistema). */
  usefulHeightPerDrawerMm: number;
  /** Distância entre faces internas das laterais. */
  distanceBetweenSidesMm: number;
  /** Distância frente ? face frontal do corpo (sobreposição / slide). */
  frontToBodyDistanceMm: number;
  /** Distância fundo ? costa (vão interno Z do fundo). */
  bottomToBackDistanceMm: number;
  /** Medidas internas do módulo (se box disponível). */
  moduleInternal?: {
    widthMm: number;
    heightMm: number;
    depthMm: number;
    usefulDepthMm: number;
  };
  moduleExternal?: {
    widthMm: number;
    heightMm: number;
    depthMm: number;
    thicknessMm: number;
  };
};

/**
 * Extrai medidas internas avançadas a partir do resultado + box opcional.
 */
export function buildOverlayMeasures(
  result: EuropeanDrawerResult,
  box?: EuropeanDrawerBoxInput
): EuropeanOverlayMeasures {
  const g = result.geometry;
  const measures: EuropeanOverlayMeasures = {
    internalUsefulWidthMm: g.internalWidthMm,
    internalUsefulDepthMm: g.bodyDepthMm,
    usefulHeightPerDrawerMm: g.usefulHeightMm,
    distanceBetweenSidesMm: g.internalWidthMm,
    frontToBodyDistanceMm: EUROPEAN_BODY_DEPTH_SLIDE_CLEARANCE_MM,
    bottomToBackDistanceMm: Math.max(0, g.bottom.depthMm),
  };

  if (box) {
    const internalW = calcBoxInternalWidthMm(box);
    const usefulD = resolveEuropeanUsefulInternalDepthMm(box);
    const internalH = Math.max(0, box.dimensoes.altura - 2 * box.espessura);
    measures.moduleInternal = {
      widthMm: internalW,
      heightMm: internalH,
      depthMm: Math.max(0, box.dimensoes.profundidade - 2 * box.espessura),
      usefulDepthMm: usefulD,
    };
    measures.moduleExternal = {
      widthMm: box.dimensoes.largura,
      heightMm: box.dimensoes.altura,
      depthMm: box.dimensoes.profundidade,
      thicknessMm: box.espessura,
    };
    // Validação documental: gap lateral industrial 7 mm
    void EUROPEAN_SIDE_CLEARANCE_EACH_MM;
    void EUROPEAN_SIDE_THICKNESS_MM;
    void EUROPEAN_BACK_THICKNESS_MM;
  }

  return measures;
}
