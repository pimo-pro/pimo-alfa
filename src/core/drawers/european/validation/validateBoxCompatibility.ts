/**
 * validateBoxCompatibility.ts — Compatibilidade modulo ? sistema europeu.
 */

import type { DrawerEuropeanModel, EuropeanDrawerBoxConfig, EuropeanDrawerBoxInput } from "../types";
import { calcBoxInternalWidthMm, calcDrawerInternalWidthMm } from "../measures";
import { calcUsefulCabinetHeightMm } from "../geometry";
import { euError, EU_ERROR_CODES } from "./errors";
import { emptyValidationResult, type EuropeanDrawerValidationResult } from "./types";
import { pickRunnerDepthMm } from "../measures";

const PARALLEL_TOL_MM = 1;

/**
 * Valida se a caixa aceita a configuracao europeia.
 * Regras: altura/prof/largura internas, dims > 0, paralelismo ±1 mm.
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

  // Paralelismo: espessura uniforme implica paredes paralelas; desvio tipico via arredondamento.
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

  const runner = pickRunnerDepthMm(model, config.depthMm, profundidade, esp);
  const internalDepth = Math.max(0, profundidade - esp - 20);
  if (runner > internalDepth + 0.5) {
    result.errors.push(
      euError(
        EU_ERROR_CODES.BOX_DEPTH,
        `Profundidade interna (${internalDepth.toFixed(0)} mm) < runner ${runner} mm.`,
        "box.dimensoes.profundidade"
      )
    );
  }

  const boxInternalW = calcBoxInternalWidthMm(box);
  const bodyW = calcDrawerInternalWidthMm(box, model);
  const required = bodyW + 2 * model.side.clearanceMm;
  if (boxInternalW + 0.5 < required || bodyW < 150) {
    result.errors.push(
      euError(
        EU_ERROR_CODES.BOX_WIDTH,
        `Largura interna insuficiente para folgas 2x${model.side.clearanceMm} mm (corpo ${bodyW.toFixed(0)} mm).`,
        "box.dimensoes.largura"
      )
    );
  }

  result.valid = result.errors.length === 0;
  return result;
}
