/**
 * overlayRodaPe.ts — Roda-pé documental (somente leitura).
 */

import type { EuropeanDrawerBoxInput, EuropeanDrawerResult } from "../types";

export type EuropeanOverlayRodaPe = {
  heightMm: number;
  recessMm: number;
  /** Posição relativa ao módulo (origem base exterior). */
  relative: {
    originYMm: number;
    widthMm: number;
    depthMm: number;
  };
  /** Vistas técnicas onde o roda-pé — relevante. */
  technicalViews: Array<"front" | "side_right" | "side_left">;
  dxfLayer: "RODAPE";
};

/** Altura documental padrão de roda-pé (não altera geometry). */
export const OVERLAY_DEFAULT_RODAPE_HEIGHT_MM = 100;
export const OVERLAY_DEFAULT_RODAPE_RECESS_MM = 0;

/**
 * Roda-pé documental alinhado ao módulo.
 */
export function buildOverlayRodaPe(
  result: EuropeanDrawerResult,
  box?: EuropeanDrawerBoxInput
): EuropeanOverlayRodaPe {
  const heightMm = OVERLAY_DEFAULT_RODAPE_HEIGHT_MM;
  const recessMm = OVERLAY_DEFAULT_RODAPE_RECESS_MM;
  const widthMm = box?.dimensoes.largura ?? result.geometry.externalWidthMm;
  const depthMm = box?.dimensoes.profundidade ?? result.geometry.runnerDepthMm + 40;

  return {
    heightMm,
    recessMm,
    relative: {
      originYMm: -(box?.dimensoes.altura ?? result.geometry.usefulHeightMm) / 2,
      widthMm,
      depthMm,
    },
    technicalViews: ["front", "side_right", "side_left"],
    dxfLayer: "RODAPE",
  };
}
