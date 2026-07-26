/**
 * safeConfig.ts — Normaliza config de entrada do Modelo B sem throw.
 */

import { HETTICH_RUNNER_LENGTHS_MM, selectHettichRunnerDepth } from "../measures/hettichRunners";
import type { EuropeanDrawerBoxConfig, EuropeanDrawerBoxInput } from "../types";
import { getEuropeanDrawerModel } from "../catalog";
import { ensureFiniteNumber, ensureNonNegative, robustDebug } from "./safeNumbers";

const MIN_HEIGHT_MM = 40;
const MAX_COUNT = 8;

/**
 * Normaliza config para valores mínimos seguros.
 * Não altera regras de negócio: apenas evita entradas destruídas.
 */
export function ensureConfigSafe(
  config: EuropeanDrawerBoxConfig,
  box?: EuropeanDrawerBoxInput
): EuropeanDrawerBoxConfig {
  const model = getEuropeanDrawerModel(config.systemId);
  let heightMm = ensureFiniteNumber(config.heightMm, "config.heightMm", model.heights[0]?.heightMm ?? 90);
  if (heightMm < MIN_HEIGHT_MM) {
    robustDebug("config.heightMm", `abaixo do mínimo ? ${MIN_HEIGHT_MM}`, heightMm);
    heightMm = MIN_HEIGHT_MM;
  }
  // Snap à altura de catálogo mais próxima
  let best = model.heights[0]!;
  let bestDist = Math.abs(best.heightMm - heightMm);
  for (const h of model.heights) {
    const d = Math.abs(h.heightMm - heightMm);
    if (d < bestDist) {
      best = h;
      bestDist = d;
    }
  }
  heightMm = best.heightMm;

  let count = Math.floor(ensureFiniteNumber(config.count ?? 1, "config.count", 1));
  if (count < 1) count = 1;
  if (count > MAX_COUNT) {
    robustDebug("config.count", `acima do máximo ? ${MAX_COUNT}`, count);
    count = MAX_COUNT;
  }

  const useful =
    box && typeof box.profundidadeInternaUtilMm === "number" && box.profundidadeInternaUtilMm > 0
      ? box.profundidadeInternaUtilMm
      : box
        ? Math.max(0, box.dimensoes.profundidade - 2 * (box.espessura || 19))
        : 500;

  let depthMm = ensureFiniteNumber(config.depthMm, "config.depthMm", 450);
  if (!(HETTICH_RUNNER_LENGTHS_MM as readonly number[]).includes(depthMm) || depthMm >= useful) {
    const safe = selectHettichRunnerDepth(useful > 0 ? useful : 500);
    robustDebug("config.depthMm", `runner inválido ? ${safe}`, { depthMm, useful });
    depthMm = safe;
  }

  const frontWidthMm =
    config.frontWidthMm == null
      ? undefined
      : ensureNonNegative(config.frontWidthMm, "config.frontWidthMm") || undefined;
  const frontHeightMm =
    config.frontHeightMm == null
      ? undefined
      : ensureNonNegative(config.frontHeightMm, "config.frontHeightMm") || undefined;

  return {
    ...config,
    heightMm,
    heightCode: best.code || config.heightCode,
    depthMm,
    count,
    softClose: config.softClose === true,
    pushOpen: config.pushOpen === true,
    dualFront: config.dualFront === true,
    frontMaterialId: config.frontMaterialId?.trim() || undefined,
    frontWidthMm: frontWidthMm && frontWidthMm > 0 ? frontWidthMm : undefined,
    frontHeightMm: frontHeightMm && frontHeightMm > 0 ? frontHeightMm : undefined,
  };
}
