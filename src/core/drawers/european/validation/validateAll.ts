/**
 * validation/validateAll.ts — Um único passo de validação industrial (Modelo B).
 * Mesma ordem / merge / autoFixes que a orquestração anterior.
 */

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

export type ValidateAllInput = {
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
 * Consolida todos os validadores num único resultado.
 */
export function validateAll(input: ValidateAllInput): EuropeanDrawerValidationResult {
  const { box, model, config, geometry, holes, cutlist, pdf, viewer, assembly } = input;

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
