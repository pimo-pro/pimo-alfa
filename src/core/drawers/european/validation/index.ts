/**
 * validation/index.ts — Orquestra a camada de validacao industrial (Modelo B).
 *
 * Independente do Modelo A. Nao toca em src/industrial/**.
 */

export type {
  EuropeanDrawerValidationResult,
  EuropeanDrawerValidationError,
  EuropeanDrawerValidationWarning,
  EuropeanDrawerAutoFixAction,
} from "./types";
export { emptyValidationResult, mergeValidationResults, validationMessages } from "./types";
export { euError, EU_ERROR_CODES } from "./errors";
export { euWarning, EU_WARNING_CODES } from "./warnings";
export { validateBoxCompatibility } from "./validateBoxCompatibility";
export { validateDrawerDimensions } from "./validateDrawerDimensions";
export { validateHolePositions } from "./validateHolePositions";
export { validateAssemblyRules } from "./validateAssemblyRules";
export { validateCutlist } from "./validateCutlist";
export { validatePdfData } from "./validatePdfData";
export { validateViewerGeometry } from "./validateViewerGeometry";
export { buildEuropeanAutoFixes, applyEuropeanAutoFixes } from "./autoFix";
export { validateAll, type ValidateAllInput } from "./validateAll";

import type { EuropeanDrawerValidationResult } from "./types";
import { validateAll, type ValidateAllInput } from "./validateAll";

export type RunEuropeanValidationInput = ValidateAllInput;

/**
 * Executa todas as validacoes industriais e anexa auto-fixes seguros.
 * Delega a `validateAll` (um único passo consolidado).
 */
export function runEuropeanDrawerValidation(
  input: RunEuropeanValidationInput
): EuropeanDrawerValidationResult {
  return validateAll(input);
}
