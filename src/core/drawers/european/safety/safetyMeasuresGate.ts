/**
 * safetyMeasuresGate.ts — Bloqueia relações de medidas industriais impossóveis.
 */

import type { DrawerEuropeanModel, EuropeanDrawerBoxConfig, EuropeanDrawerBoxInput } from "../types";
import {
  EUROPEAN_BODY_DEPTH_SLIDE_CLEARANCE_MM,
  EUROPEAN_SIDE_THICKNESS_MM,
  EUROPEAN_BACK_THICKNESS_MM,
  EUROPEAN_BOTTOM_THICKNESS_MM,
  calcBoxInternalWidthMm,
  calcDrawerExternalWidthMm,
  calcDrawerInternalWidthMm,
  calcBodyDepthWithoutFrontMm,
  calcFrontWidthMm,
  calcFrontHeightMm,
  calcBottomWidthMm,
  calcBottomDepthMm,
  calcBackWidthMm,
  calcBackHeightMm,
} from "../measures";
import { finalizeGate, issue, type EuropeanSafetyGateResult } from "./safetyReport";

/**
 * Gate de medidas: largura, corpo vs runner, frente vs caixa, fundo/laterais/costa.
 */
export function runSafetyMeasuresGate(
  config: EuropeanDrawerBoxConfig,
  box: EuropeanDrawerBoxInput,
  model?: DrawerEuropeanModel
): EuropeanSafetyGateResult {
  const t0 = performance.now();
  const errors = [];
  const warnings = [];

  const internalBox = calcBoxInternalWidthMm(box);
  const external = calcDrawerExternalWidthMm(box);
  const internalBody = calcDrawerInternalWidthMm(box, model);
  const bodyDepth = calcBodyDepthWithoutFrontMm(config.depthMm);
  const expectedBody = config.depthMm - EUROPEAN_BODY_DEPTH_SLIDE_CLEARANCE_MM;

  if (!(external > 0) || !(internalBody > 0)) {
    errors.push(
      issue(
        "measures",
        "error",
        "WIDTH_NON_POSITIVE",
        `Larguras invalidas externa=${external} interna=${internalBody}`
      )
    );
  }

  if (external > internalBox + 0.01) {
    errors.push(
      issue(
        "measures",
        "error",
        "DRAWER_WIDER_THAN_INTERNAL",
        `Largura gaveta ${external} mm > largura interna caixa ${internalBox} mm`
      )
    );
  }

  if (Math.abs(bodyDepth - expectedBody) > 0.01) {
    errors.push(
      issue(
        "measures",
        "error",
        "BODY_DEPTH_VS_RUNNER",
        `Profundidade corpo ${bodyDepth} mm incompativel com runner ${config.depthMm} mm (esperado ${expectedBody})`
      )
    );
  }

  if (bodyDepth > config.depthMm + 0.01) {
    errors.push(
      issue(
        "measures",
        "error",
        "BODY_DEEPER_THAN_RUNNER",
        `Corpo ${bodyDepth} mm > runner ${config.depthMm} mm`
      )
    );
  }

  const frontW =
    config.frontWidthMm && config.frontWidthMm > 0 ? config.frontWidthMm : calcFrontWidthMm(box);
  if (frontW > internalBox + 0.01) {
    errors.push(
      issue(
        "measures",
        "error",
        "FRONT_VS_BOX",
        `Frente ${frontW} mm > abertura caixa ${internalBox} mm`,
        "gav_fren"
      )
    );
  }

  const frontH =
    config.frontHeightMm && config.frontHeightMm > 0
      ? config.frontHeightMm
      : calcFrontHeightMm(config.heightMm);
  if (frontH > box.dimensoes.altura + 0.01) {
    errors.push(
      issue(
        "measures",
        "error",
        "FRONT_H_VS_BOX",
        `Frente altura ${frontH} mm > caixa ${box.dimensoes.altura} mm`,
        "gav_fren"
      )
    );
  }

  const bottomW = calcBottomWidthMm(external);
  const sideInner = external - 2 * EUROPEAN_SIDE_THICKNESS_MM;
  // Fundo entra 10 mm em cada lateral ? bottomW = sideInner + 20; deve caber entre faces externas das laterais
  if (bottomW > external + 0.01 || bottomW < sideInner - 0.01) {
    errors.push(
      issue(
        "measures",
        "error",
        "BOTTOM_VS_SIDES",
        `Fundo largura ${bottomW} mm incompativel com laterais (externa ${external}, interna ${sideInner})`,
        "gav_fun"
      )
    );
  }

  const bottomD = calcBottomDepthMm(bodyDepth, {
    hasInnerFront: config.dualFront === true,
    backThicknessMm: EUROPEAN_BACK_THICKNESS_MM,
  });
  if (bottomD <= 0 && bodyDepth > EUROPEAN_BACK_THICKNESS_MM) {
    errors.push(
      issue("measures", "error", "BOTTOM_DEPTH_INVALID", `Profundidade fundo invalida: ${bottomD}`, "gav_fun")
    );
  }

  const backW = calcBackWidthMm(external);
  const backH = calcBackHeightMm(config.heightMm, EUROPEAN_BOTTOM_THICKNESS_MM);
  if (Math.abs(backW - sideInner) > 0.01) {
    errors.push(
      issue(
        "measures",
        "error",
        "BACK_VS_SIDES",
        `Costa largura ${backW} mm incompativel com vao entre laterais ${sideInner}`,
        "gav_costa"
      )
    );
  }
  if (backH > config.heightMm + 0.01) {
    errors.push(
      issue(
        "measures",
        "error",
        "BACK_VS_HEIGHT",
        `Costa altura ${backH} mm incompativel com altura sistema ${config.heightMm}`,
        "gav_costa"
      )
    );
  }

  return finalizeGate("measures", t0, errors, warnings);
}
