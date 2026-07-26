/**
 * Tipos agregados da camada de validacao industrial (Modelo B).
 */

import type { EuropeanDrawerBoxConfig } from "../types";
import type { EuropeanDrawerValidationError } from "./errors";
import type { EuropeanDrawerValidationWarning } from "./warnings";

export type { EuropeanDrawerValidationError } from "./errors";
export type { EuropeanDrawerValidationWarning } from "./warnings";

/**
 * Accao de auto-correcao.
 * Nunca altera o catalogo oficial — apenas a config da caixa.
 */
export type EuropeanDrawerAutoFixAction = {
  code: string;
  description: string;
  /** Aplica a correcao sobre a config (imutavel). */
  apply: (_config: EuropeanDrawerBoxConfig) => EuropeanDrawerBoxConfig;
};

export type EuropeanDrawerValidationResult = {
  valid: boolean;
  errors: EuropeanDrawerValidationError[];
  warnings: EuropeanDrawerValidationWarning[];
  autoFixes: EuropeanDrawerAutoFixAction[];
};

export function emptyValidationResult(): EuropeanDrawerValidationResult {
  return { valid: true, errors: [], warnings: [], autoFixes: [] };
}

export function mergeValidationResults(
  ...parts: EuropeanDrawerValidationResult[]
): EuropeanDrawerValidationResult {
  const errors = parts.flatMap((p) => p.errors);
  const warnings = parts.flatMap((p) => p.warnings);
  const autoFixes = parts.flatMap((p) => p.autoFixes);
  // Dedup autoFixes by code
  const seen = new Set<string>();
  const uniqueFixes = autoFixes.filter((f) => {
    if (seen.has(f.code)) return false;
    seen.add(f.code);
    return true;
  });
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    autoFixes: uniqueFixes,
  };
}

export function validationMessages(result: EuropeanDrawerValidationResult): {
  errors: string[];
  warnings: string[];
} {
  return {
    errors: result.errors.map((e) => e.message),
    warnings: result.warnings.map((w) => w.message),
  };
}
