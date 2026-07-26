/**
 * validateDrawerDimensions.ts — Dimensões da gaveta europeia (regras industriais B).
 */

import type {
  DrawerEuropeanModel,
  DrawerGeometry,
  EuropeanDrawerBoxConfig,
  EuropeanDrawerBoxInput,
} from "../types";
import {
  EUROPEAN_BODY_DEPTH_SLIDE_CLEARANCE_MM,
  EUROPEAN_SIDE_CLEARANCE_EACH_MM,
  calcBoxInternalWidthMm,
  calcDrawerExternalWidthMm,
  calcDrawerInternalWidthMm,
  calcFrontWidthMm,
  selectHettichRunnerDepth,
  resolveEuropeanUsefulInternalDepthMm,
} from "../measures";
import { euError, EU_ERROR_CODES } from "./errors";
import { emptyValidationResult, type EuropeanDrawerValidationResult } from "./types";

/**
 * Valida geometria calculada vs regras industriais Modelo B.
 */
export function validateDrawerDimensions(
  box: EuropeanDrawerBoxInput,
  model: DrawerEuropeanModel,
  config: EuropeanDrawerBoxConfig,
  geometry: DrawerGeometry
): EuropeanDrawerValidationResult {
  const result = emptyValidationResult();
  void model;

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

  const expectedExternal = calcDrawerExternalWidthMm(box);
  if (Math.abs(geometry.externalWidthMm - expectedExternal) > 0.6) {
    result.errors.push(
      euError(
        EU_ERROR_CODES.DIM_SIDE_CLEARANCE,
        `Largura externa deve ser interna ? 14 mm (folga ${EUROPEAN_SIDE_CLEARANCE_EACH_MM}+${EUROPEAN_SIDE_CLEARANCE_EACH_MM}).`,
        "geometry.externalWidthMm"
      )
    );
  }

  const expectedBody = calcDrawerInternalWidthMm(box);
  if (Math.abs(geometry.internalWidthMm - expectedBody) > 0.6) {
    result.errors.push(
      euError(
        EU_ERROR_CODES.DIM_INTERNAL_WIDTH,
        "Largura interna do corpo inconsistente com laterais 16 mm.",
        "geometry.internalWidthMm"
      )
    );
  }

  const useful = resolveEuropeanUsefulInternalDepthMm(box);
  const expectedRunner = selectHettichRunnerDepth(useful);
  if (geometry.runnerDepthMm !== expectedRunner && geometry.runnerDepthMm >= useful) {
    result.errors.push(
      euError(
        EU_ERROR_CODES.BOX_DEPTH,
        `Corrediça ${geometry.runnerDepthMm} mm deve ser Hettich e < profundidade útil ${useful.toFixed(0)} mm (esperado ${expectedRunner}).`,
        "geometry.runnerDepthMm"
      )
    );
  }

  const expectedBodyDepth = geometry.runnerDepthMm - EUROPEAN_BODY_DEPTH_SLIDE_CLEARANCE_MM;
  if (Math.abs(geometry.bodyDepthMm - expectedBodyDepth) > 0.6) {
    result.errors.push(
      euError(
        EU_ERROR_CODES.DIM_BOTTOM,
        `Profundidade do corpo deve ser corrediça ? ${EUROPEAN_BODY_DEPTH_SLIDE_CLEARANCE_MM} mm.`,
        "geometry.bodyDepthMm"
      )
    );
  }

  const boxInternal = calcBoxInternalWidthMm(box);
  if (geometry.bottom.widthMm > boxInternal + 1) {
    result.errors.push(
      euError(EU_ERROR_CODES.DIM_BOTTOM, "Fundo ultrapassa a largura interna da caixa.", "geometry.bottom")
    );
  }
  if (geometry.bottom.depthMm > geometry.bodyDepthMm + 1) {
    result.errors.push(
      euError(EU_ERROR_CODES.DIM_BOTTOM, "Profundidade do fundo maior que o corpo.", "geometry.bottom.depthMm")
    );
  }

  if (geometry.leftSide.depthMm <= 0 || geometry.rightSide.depthMm <= 0) {
    result.errors.push(
      euError(EU_ERROR_CODES.DIM_SIDE_CLEARANCE, "Laterais madeira em falta (Modelo B).", "geometry.sides")
    );
  }

  // Frente: se não houver override, deve respeitar folga oficial
  if (config.frontWidthMm == null) {
    const expectedFrontW = calcFrontWidthMm(box);
    if (Math.abs(geometry.front.widthMm - expectedFrontW) > 1) {
      result.errors.push(
        euError(
          EU_ERROR_CODES.DIM_FRONT_SETBACK,
          `Frente ${geometry.front.widthMm.toFixed(1)} mm não respeita folga (esperado ~${expectedFrontW.toFixed(1)} mm).`,
          "geometry.front"
        )
      );
    }
  }

  if (config.heightMm !== geometry.usefulHeightMm && Math.abs(config.heightMm - geometry.usefulHeightMm) > 0.5) {
    result.errors.push(
      euError(EU_ERROR_CODES.DIM_USEFUL_HEIGHT, "Altura util diverge da config do sistema.", "config.heightMm")
    );
  }

  result.valid = result.errors.length === 0;
  return result;
}
