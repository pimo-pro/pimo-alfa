/**
 * european/safety — Industrial Safety Gates & Runtime Guards (Modelo B).
 * Apenas bloqueio preventivo; sem auto-correção; sem alterar resultados válidos.
 */

export {
  runSafetyConfigGate,
} from "./safetyConfigGate";
export { runSafetyMeasuresGate } from "./safetyMeasuresGate";
export { runSafetyGeometryGate } from "./safetyGeometryGate";
export { runSafetyDrillingGate } from "./safetyDrillingGate";
export { runSafetyCutlistGate } from "./safetyCutlistGate";
export { runSafetyPdfGate } from "./safetyPdfGate";
export { runSafetyViewerGate } from "./safetyViewerGate";
export {
  buildSafetyReport,
  formatSafetyReportText,
  emptyGateResult,
  issue,
  finalizeGate,
  type EuropeanSafetyGateId,
  type EuropeanSafetyIssue,
  type EuropeanSafetyGateResult,
  type EuropeanSafetyReport,
} from "./safetyReport";

import type {
  DrawerEuropeanModel,
  DrawerGeometry,
  DrawerCutlistItem,
  DrawerPDFSection,
  EuropeanDrawerBoxConfig,
  EuropeanDrawerBoxInput,
  EuropeanDrawerHole,
  EuropeanDrawerViewerData,
} from "../types";
import { runSafetyConfigGate } from "./safetyConfigGate";
import { runSafetyMeasuresGate } from "./safetyMeasuresGate";
import { runSafetyGeometryGate } from "./safetyGeometryGate";
import { runSafetyDrillingGate } from "./safetyDrillingGate";
import { runSafetyCutlistGate } from "./safetyCutlistGate";
import { runSafetyPdfGate } from "./safetyPdfGate";
import { runSafetyViewerGate } from "./safetyViewerGate";
import { buildSafetyReport, type EuropeanSafetyReport } from "./safetyReport";

/** Gates pré-pipeline (config + medidas). */
export function runPrePipelineSafetyGates(
  config: EuropeanDrawerBoxConfig,
  box: EuropeanDrawerBoxInput,
  model: DrawerEuropeanModel
): EuropeanSafetyReport {
  return buildSafetyReport([
    runSafetyConfigGate(config, box, model),
    runSafetyMeasuresGate(config, box, model),
  ]);
}

/** Gates pós-pipeline (geometria, furos, cutlist, pdf, viewer). */
export function runPostPipelineSafetyGates(input: {
  geometry: DrawerGeometry;
  holes: EuropeanDrawerHole[];
  cutlist: DrawerCutlistItem[];
  pdf: DrawerPDFSection;
  viewer: EuropeanDrawerViewerData;
}): EuropeanSafetyReport {
  return buildSafetyReport([
    runSafetyGeometryGate(input.geometry),
    runSafetyDrillingGate(input.holes, input.geometry),
    runSafetyCutlistGate(input.cutlist),
    runSafetyPdfGate(input.pdf),
    runSafetyViewerGate(input.viewer),
  ]);
}

/** Junta dois relatérios (pré + pós). */
export function mergeSafetyReports(
  ...reports: EuropeanSafetyReport[]
): EuropeanSafetyReport {
  return buildSafetyReport(reports.flatMap((r) => r.gates));
}
