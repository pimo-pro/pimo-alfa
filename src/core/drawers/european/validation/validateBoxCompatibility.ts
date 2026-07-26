/**
 * validateBoxCompatibility.ts — Compatibilidade módulo ? sistema europeu.
 */

import type { DrawerEuropeanModel, EuropeanDrawerBoxConfig, EuropeanDrawerBoxInput } from "../types";
import {
  EUROPEAN_SIDE_CLEARANCE_EACH_MM,
  calcBoxInternalWidthMm,
  calcDrawerExternalWidthMm,
  resolveEuropeanUsefulInternalDepthMm,
  selectHettichRunnerDepth,
} from "../measures";
import { calcUsefulCabinetHeightMm } from "../geometry";
import { euError, EU_ERROR_CODES } from "./errors";
import { emptyValidationResult, type EuropeanDrawerValidationResult } from "./types";

const PARALLEL_TOL_MM = 1;

/**
 * Valida se a caixa aceita a configuração europeia.
 */
export function validateBoxCompatibility(
  box: EuropeanDrawerBoxInput,
  model: DrawerEuropeanModel,
  config: EuropeanDrawerBoxConfig
): EuropeanDrawerValidationResult {
  const result = emptyValidationResult();
  const { largura, altura, profundidade } = box.dimensoes;
  const esp = box.espessura;
  const count = Math.max(1, Math.floor(config.count ?? box.gavetas ?? 1));

  if (largura <= 0 || altura <= 0 || profundidade <= 0 || esp <= 0) {
    result.errors.push(
      euError(EU_ERROR_CODES.BOX_NEGATIVE, "Caixa com medidas negativas ou nulas.", "box.dimensoes")
    );
  }

  const halfTol = PARALLEL_TOL_MM;
  if (Math.abs(esp - Math.round(esp)) > halfTol && esp > 0) {
    result.errors.push(
      euError(
        EU_ERROR_CODES.BOX_PARALLEL,
        `Espessura fora da tolerancia de paralelismo (±${PARALLEL_TOL_MM} mm).`,
        "box.espessura"
      )
    );
  }

  const usefulH = calcUsefulCabinetHeightMm(box);
  const neededH = count * config.heightMm + Math.max(0, count - 1) * 6 + model.assembly.toleranceMm;
  if (neededH > usefulH + 0.5) {
    result.errors.push(
      euError(
        EU_ERROR_CODES.BOX_HEIGHT,
        `Altura interna insuficiente: necessario ~${neededH.toFixed(0)} mm, disponivel ~${usefulH.toFixed(0)} mm.`,
        "box.dimensoes.altura"
      )
    );
  }

  const usefulDepth = resolveEuropeanUsefulInternalDepthMm(box);
  const runner = selectHettichRunnerDepth(usefulDepth);
  if (runner >= usefulDepth && usefulDepth > 0) {
    result.errors.push(
      euError(
        EU_ERROR_CODES.BOX_DEPTH,
        `Profundidade útil interna (${usefulDepth.toFixed(0)} mm) não admite corrediça Hettich < útil.`,
        "box.dimensoes.profundidade"
      )
    );
  }
  if (config.depthMm >= usefulDepth && usefulDepth > 0) {
    result.errors.push(
      euError(
        EU_ERROR_CODES.BOX_DEPTH,
        `Corrediça ${config.depthMm} mm deve ser < profundidade útil ${usefulDepth.toFixed(0)} mm.`,
        "config.depthMm"
      )
    );
  }

  const boxInternalW = calcBoxInternalWidthMm(box);
  const externalW = calcDrawerExternalWidthMm(box);
  if (boxInternalW < 150 || externalW < 120) {
    result.errors.push(
      euError(
        EU_ERROR_CODES.BOX_WIDTH,
        `Largura interna insuficiente para folgas 2x${EUROPEAN_SIDE_CLEARANCE_EACH_MM} mm (externa gaveta ${externalW.toFixed(0)} mm).`,
        "box.dimensoes.largura"
      )
    );
  }

  result.valid = result.errors.length === 0;
  return result;
}
