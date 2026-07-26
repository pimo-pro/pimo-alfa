/**
 * validateAssemblyRules.ts — Montagem industrial Modelo B.
 */

import type {
  DrawerAssemblyRules,
  DrawerEuropeanModel,
  DrawerGeometry,
} from "../types";
import { euError, EU_ERROR_CODES } from "./errors";
import { euWarning, EU_WARNING_CODES } from "./warnings";
import { emptyValidationResult, type EuropeanDrawerValidationResult } from "./types";

/**
 * Valida ordem, tolerancias e alinhamentos geometricos basicos.
 */
export function validateAssemblyRules(
  model: DrawerEuropeanModel,
  geometry: DrawerGeometry,
  assembly: DrawerAssemblyRules
): EuropeanDrawerValidationResult {
  const result = emptyValidationResult();

  if (!assembly.order || assembly.order.length < 3) {
    result.errors.push(
      euError(EU_ERROR_CODES.ASM_ORDER, "Ordem de montagem incompleta ou invalida.", "assembly.order")
    );
  }

  if (assembly.toleranceMm < 0 || assembly.toleranceMm > 2) {
    result.warnings.push(
      euWarning(
        EU_WARNING_CODES.ASM_TOLERANCE,
        `Tolerancia de montagem ${assembly.toleranceMm} mm fora do intervalo tipico 0–2 mm.`,
        "assembly.toleranceMm"
      )
    );
  }

  if (geometry.front.originZMm <= geometry.bottom.originZMm) {
    result.errors.push(
      euError(EU_ERROR_CODES.ASM_OVERLAP, "Frente nao fica a frente do fundo (sobreposicao Z).", "assembly.z")
    );
  }

  const backOk =
    Math.abs(geometry.back.widthMm - geometry.internalWidthMm) <= model.assembly.toleranceMm + 1;
  if (!backOk && geometry.back.widthMm > 0) {
    result.errors.push(
      euError(EU_ERROR_CODES.ASM_ALIGN, "Traseira nao alinha com largura interna / fundo.", "assembly.back")
    );
  }

  if (Math.abs(geometry.front.originXMm) > model.assembly.toleranceMm + 0.5) {
    result.errors.push(
      euError(EU_ERROR_CODES.ASM_ALIGN, "Frente desalinhada relativamente ao eixo do modulo.", "assembly.front")
    );
  }

  if (Math.abs(geometry.bottom.originXMm) > model.assembly.toleranceMm + 0.5) {
    result.errors.push(
      euError(EU_ERROR_CODES.ASM_ALIGN, "Fundo desalinhado relativamente as laterais/centro.", "assembly.bottom")
    );
  }

  result.valid = result.errors.length === 0;
  return result;
}
