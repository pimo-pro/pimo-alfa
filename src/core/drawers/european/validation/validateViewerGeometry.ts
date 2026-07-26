/**
 * validateViewerGeometry.ts — Geometria de viewer Modelo B.
 */

import type {
  DrawerGeometry,
  EuropeanDrawerBoxInput,
  EuropeanDrawerHole,
  EuropeanDrawerViewerData,
} from "../types";
import { euError, EU_ERROR_CODES } from "./errors";
import { euWarning, EU_WARNING_CODES } from "./warnings";
import { emptyValidationResult, type EuropeanDrawerValidationResult } from "./types";
import { calcEuropeanDrawerPullOffsetMm } from "../viewer";

/**
 * Valida bounds, furos, coerencia e risco de clipping na abertura.
 */
export function validateViewerGeometry(
  box: EuropeanDrawerBoxInput,
  geometry: DrawerGeometry,
  holes: EuropeanDrawerHole[],
  viewer: EuropeanDrawerViewerData
): EuropeanDrawerValidationResult {
  const result = emptyValidationResult();
  const halfW = box.dimensoes.largura / 2;
  const halfH = box.dimensoes.altura / 2;
  const halfD = box.dimensoes.profundidade / 2;

  if (Math.abs(geometry.front.originXMm) + geometry.front.widthMm / 2 > halfW + 3) {
    result.errors.push(
      euError(EU_ERROR_CODES.VIEW_BOUNDS, "Frente sai fora da caixa em X no viewer.", "viewer.front")
    );
  }
  if (Math.abs(geometry.front.originYMm) + geometry.front.heightMm / 2 > halfH + 5) {
    result.errors.push(
      euError(EU_ERROR_CODES.VIEW_BOUNDS, "Frente sai fora da caixa em Y no viewer.", "viewer.front")
    );
  }

  if (Math.abs(geometry.usefulHeightMm - geometry.front.heightMm - 2) > 20) {
    result.warnings.push(
      euWarning(EU_WARNING_CODES.VIEW_HOLE, "Altura frente vs sistema pouco coerente no viewer.", "viewer.coherence")
    );
  }

  if (viewer.drawers.length === 0 && geometry.front.widthMm > 0) {
    result.errors.push(
      euError(EU_ERROR_CODES.VIEW_COHERENCE, "Viewer sem gavetas apesar de geometria gerada.", "viewer.drawers")
    );
  }

  for (const d of viewer.drawers) {
    if (d.holes.length === 0) {
      result.warnings.push(
        euWarning(EU_WARNING_CODES.VIEW_HOLE, `Gaveta ${d.index} sem furos no viewer.`, "viewer.holes")
      );
    }
    const pull = calcEuropeanDrawerPullOffsetMm(1, d.maxPullMm);
    if (pull > halfD * 2 + 50) {
      result.warnings.push(
        euWarning(
          EU_WARNING_CODES.VIEW_CLIPPING,
          `Abertura maxima ${pull.toFixed(0)} mm pode causar clipping extremo.`,
          "viewer.animation"
        )
      );
    }
    if (d.maxPullMm <= 0) {
      result.errors.push(
        euError(
          EU_ERROR_CODES.VIEW_CLIPPING,
          "maxPullMm invalido — animacao de abertura impossivel.",
          "viewer.animation"
        )
      );
    }
  }

  for (const h of holes.filter((x) => x.pieceRef === "front")) {
    if (h.x < 0 || h.x > geometry.front.widthMm || h.y < 0 || h.y > geometry.front.heightMm) {
      result.errors.push(
        euError(EU_ERROR_CODES.VIEW_HOLE, "Furo de frente fora da peca no viewer.", "viewer.holes")
      );
    }
  }

  result.valid = result.errors.length === 0;
  return result;
}
