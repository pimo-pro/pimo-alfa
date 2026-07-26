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

import type {
  DrawerAssemblyRules,
  DrawerCutlistItem,
  DrawerEuropeanModel,
  DrawerGeometry,
  DrawerPDFSection,
  EuropeanDrawerBoxConfig,
  EuropeanDrawerBoxInput,
  EuropeanDrawerHole,
  EuropeanDrawerViewerData,
} from "../types";
import { mergeValidationResults, type EuropeanDrawerValidationResult } from "./types";
import { validateBoxCompatibility } from "./validateBoxCompatibility";
import { validateDrawerDimensions } from "./validateDrawerDimensions";
import { validateHolePositions } from "./validateHolePositions";
import { validateAssemblyRules } from "./validateAssemblyRules";
import { validateCutlist } from "./validateCutlist";
import { validatePdfData } from "./validatePdfData";
import { validateViewerGeometry } from "./validateViewerGeometry";
import { buildEuropeanAutoFixes } from "./autoFix";

export type RunEuropeanValidationInput = {
  box: EuropeanDrawerBoxInput;
  model: DrawerEuropeanModel;
  config: EuropeanDrawerBoxConfig;
  geometry: DrawerGeometry;
  holes: EuropeanDrawerHole[];
  cutlist: DrawerCutlistItem[];
  pdf: DrawerPDFSection;
  viewer: EuropeanDrawerViewerData;
  assembly: DrawerAssemblyRules;
};

/**
 * Executa todas as validacoes industriais e anexa auto-fixes seguros.
 */
export function runEuropeanDrawerValidation(input: RunEuropeanValidationInput): EuropeanDrawerValidationResult {
  const {
    box,
    model,
    config,
    geometry,
    holes,
    cutlist,
    pdf,
    viewer,
    assembly,
  } = input;

  const merged = mergeValidationResults(
    validateBoxCompatibility(box, model, config),
    validateDrawerDimensions(box, model, config, geometry),
    validateHolePositions(box, model, geometry, holes),
    validateAssemblyRules(model, geometry, assembly),
    validateCutlist(model, geometry, cutlist),
    validatePdfData(pdf, geometry, holes),
    validateViewerGeometry(box, geometry, holes, viewer)
  );

  const autoFixes = buildEuropeanAutoFixes(box, model, config, merged.errors);
  return {
    ...merged,
    autoFixes,
  };
}
