/**
 * safetyConfigGate.ts — Bloqueia configs industriais impossóveis (sem auto-correção).
 */

import type { DrawerEuropeanModel, EuropeanDrawerBoxConfig, EuropeanDrawerBoxInput } from "../types";
import {
  HETTICH_RUNNER_LENGTHS_MM,
  isHettichRunnerLengthMm,
  resolveEuropeanUsefulInternalDepthMm,
  calcBoxInternalWidthMm,
  calcFrontWidthMm,
  calcFrontHeightMm,
} from "../measures";
import { finalizeGate, issue, type EuropeanSafetyGateResult } from "./safetyReport";

const MAX_DRAWERS = 8;
const MIN_USEFUL_DEPTH_MM = 300;

function isBlankMaterial(value: string | undefined): boolean {
  return value != null && value.trim() === "";
}

/**
 * Gate de configuração: runner, altura, frente, count, profundidade útil, materiais, flags.
 */
export function runSafetyConfigGate(
  config: EuropeanDrawerBoxConfig,
  box: EuropeanDrawerBoxInput,
  model: DrawerEuropeanModel
): EuropeanSafetyGateResult {
  const t0 = performance.now();
  const errors = [];
  const warnings = [];

  const useful = resolveEuropeanUsefulInternalDepthMm(box);
  if (!(useful > 0) || !Number.isFinite(useful)) {
    errors.push(issue("config", "error", "USEFUL_DEPTH_INVALID", `Profundidade interna util invalida: ${useful}`));
  } else if (useful < MIN_USEFUL_DEPTH_MM) {
    errors.push(
      issue(
        "config",
        "error",
        "USEFUL_DEPTH_INSUFFICIENT",
        `Profundidade interna util ${useful} mm insuficiente (min ${MIN_USEFUL_DEPTH_MM} mm para Hettich)`
      )
    );
  }

  if (!isHettichRunnerLengthMm(config.depthMm)) {
    errors.push(
      issue(
        "config",
        "error",
        "RUNNER_NOT_CATALOG",
        `Runner ${config.depthMm} mm fora do catalogo Hettich [${HETTICH_RUNNER_LENGTHS_MM.join(", ")}]`
      )
    );
  } else if (useful > 0 && !(config.depthMm < useful)) {
    errors.push(
      issue(
        "config",
        "error",
        "RUNNER_VS_USEFUL",
        `Runner ${config.depthMm} mm incompativel com profundidade util ${useful} mm (deve ser estritamente menor)`
      )
    );
  }

  const heightOk = model.heights.some((h) => h.heightMm === config.heightMm);
  if (!heightOk) {
    errors.push(
      issue(
        "config",
        "error",
        "HEIGHT_NOT_CATALOG",
        `Altura ${config.heightMm} mm fora do catalogo ${model.id}`
      )
    );
  }

  const count = Math.floor(config.count ?? box.gavetas ?? 1);
  if (!Number.isFinite(count) || count < 1 || count > MAX_DRAWERS) {
    errors.push(
      issue("config", "error", "COUNT_INVALID", `Numero de gavetas invalido: ${config.count ?? box.gavetas}`)
    );
  }

  const boxW = box.dimensoes?.largura;
  const boxH = box.dimensoes?.altura;
  const boxD = box.dimensoes?.profundidade;
  if (![boxW, boxH, boxD, box.espessura].every((n) => Number.isFinite(n) && (n as number) > 0)) {
    errors.push(
      issue("config", "error", "BOX_DIMS_INVALID", "Dimensoes da caixa invalidas (NaN/<=0)")
    );
  }

  const openingW = calcBoxInternalWidthMm(box);
  const defaultFrontW = calcFrontWidthMm(box);
  const frontW = config.frontWidthMm && config.frontWidthMm > 0 ? config.frontWidthMm : defaultFrontW;
  if (Number.isFinite(openingW) && frontW > openingW + 0.01) {
    errors.push(
      issue(
        "config",
        "error",
        "FRONT_WIDER_THAN_BOX",
        `Frente ${frontW} mm maior que abertura interna ${openingW} mm`,
        "gav_fren"
      )
    );
  }

  const frontH =
    config.frontHeightMm && config.frontHeightMm > 0
      ? config.frontHeightMm
      : calcFrontHeightMm(config.heightMm);
  if (Number.isFinite(boxH) && frontH > boxH + 0.01) {
    errors.push(
      issue(
        "config",
        "error",
        "FRONT_TALLER_THAN_BOX",
        `Frente altura ${frontH} mm maior que caixa ${boxH} mm`,
        "gav_fren"
      )
    );
  }

  if (isBlankMaterial(box.material)) {
    errors.push(issue("config", "error", "BOX_MATERIAL_EMPTY", "Material da caixa vazio/inexistente"));
  }
  if (isBlankMaterial(config.frontMaterialId)) {
    errors.push(issue("config", "error", "FRONT_MATERIAL_EMPTY", "Material da frente vazio/inexistente", "gav_fren"));
  }

  if (config.dualFront === true && config.pushOpen === true && config.softClose === true) {
    warnings.push(
      issue(
        "config",
        "warning",
        "FLAGS_DUAL_PUSH_SOFT",
        "Flags dualFront + pushOpen + softClose simultaneas — verificar catalogo"
      )
    );
  }

  // dualFront sem altura de sistema coerente
  if (config.dualFront === true && !(config.heightMm > 0)) {
    errors.push(
      issue("config", "error", "DUAL_FRONT_NO_HEIGHT", "dualFront activo sem altura de sistema valida")
    );
  }

  return finalizeGate("config", t0, errors, warnings);
}
