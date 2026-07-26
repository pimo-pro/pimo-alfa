/**
 * validateDrawerDimensions.ts — Dimensoes da gaveta europeia.
 */

import type {
  DrawerEuropeanModel,
  DrawerGeometry,
  EuropeanDrawerBoxConfig,
  EuropeanDrawerBoxInput,
} from "../types";
import { calcBoxInternalWidthMm, calcDrawerInternalWidthMm, calcFrontWidthMm } from "../measures";
import { euError, EU_ERROR_CODES } from "./errors";
import { emptyValidationResult, type EuropeanDrawerValidationResult } from "./types";

/**
 * Valida geometria calculada vs regras oficiais da marca.
 */
export function validateDrawerDimensions(
  box: EuropeanDrawerBoxInput,
  model: DrawerEuropeanModel,
  config: EuropeanDrawerBoxConfig,
  geometry: DrawerGeometry
): EuropeanDrawerValidationResult {
  const result = emptyValidationResult();

  if (geometry.internalWidthMm < 0) {
    result.errors.push(
      euError(EU_ERROR_CODES.DIM_INTERNAL_WIDTH, "Largura interna calculada < 0.", "geometry.internalWidthMm")
    );
  }
  if (geometry.usefulHeightMm < 0) {
    result.errors.push(
      euError(EU_ERROR_CODES.DIM_USEFUL_HEIGHT, "Altura util < 0.", "geometry.usefulHeightMm")
    );
  }

  const boxInternal = calcBoxInternalWidthMm(box);
  const expectedBody = calcDrawerInternalWidthMm(box, model);
  if (Math.abs(geometry.internalWidthMm - expectedBody) > 0.6) {
    result.errors.push(
      euError(
        EU_ERROR_CODES.DIM_SIDE_CLEARANCE,
        `Largura interna nao respeita sideClearance ${model.side.clearanceMm} mm da marca.`,
        "geometry.internalWidthMm"
      )
    );
  }

  // Fundo dentro da caixa
  const halfW = box.dimensoes.largura / 2;
  const halfD = box.dimensoes.profundidade / 2;
  const bottomHalfW = geometry.bottom.widthMm / 2;
  if (geometry.bottom.widthMm > boxInternal + 1) {
    result.errors.push(
      euError(EU_ERROR_CODES.DIM_BOTTOM, "Fundo ultrapassa a largura interna da caixa.", "geometry.bottom")
    );
  }
  if (Math.abs(geometry.bottom.originXMm) + bottomHalfW > halfW + 2) {
    result.errors.push(
      euError(EU_ERROR_CODES.DIM_BOTTOM, "Origem do fundo fora dos limites da caixa.", "geometry.bottom.origin")
    );
  }
  if (geometry.bottom.depthMm > geometry.runnerDepthMm + 1) {
    result.errors.push(
      euError(EU_ERROR_CODES.DIM_BOTTOM, "Profundidade do fundo maior que o runner.", "geometry.bottom.depthMm")
    );
  }
  void halfD;

  // Frente: largura com folga; setback e regra de furos (validado tambem em holes)
  const expectedFrontW = calcFrontWidthMm(box);
  if (Math.abs(geometry.front.widthMm - expectedFrontW) > 1) {
    result.errors.push(
      euError(
        EU_ERROR_CODES.DIM_FRONT_SETBACK,
        `Frente ${geometry.front.widthMm.toFixed(1)} mm nao respeita folga/setback oficial (esperado ~${expectedFrontW.toFixed(1)} mm).`,
        "geometry.front"
      )
    );
  }

  if (config.heightMm !== geometry.usefulHeightMm && Math.abs(config.heightMm - geometry.usefulHeightMm) > 0.5) {
    result.errors.push(
      euError(EU_ERROR_CODES.DIM_USEFUL_HEIGHT, "Altura util diverge da config do sistema.", "config.heightMm")
    );
  }

  result.valid = result.errors.length === 0;
  return result;
}
