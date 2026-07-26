/**
 * european/qa — Auto QA Stress Testing (Modelo B).
 * Simulação interna: sem CNC, sem industrial/**, sem mutar projeto.
 */

export type {
  EuropeanQaFrenteDims,
  EuropeanQaGavetaSpec,
  EuropeanQaScenario,
  EuropeanQaScenarioResult,
  EuropeanQaSummary,
  EuropeanQaProgress,
} from "./types";

export { ALL_SCENARIOS, buildEuropeanQaScenarios } from "./scenarios";
export { runScenario } from "./runScenario";
export { runStressTests, type RunStressTestsOptions } from "./stressTestRunner";

export { formatScenarioConsoleLine, reportConsole } from "./reporters/consoleReporter";
export {
  QA_RESULTS_FILENAME,
  buildQaResultsJson,
  serializeQaResultsJson,
  createQaResultsBlob,
  downloadQaResultsJson,
  type EuropeanQaJsonPayload,
} from "./reporters/jsonReporter";
export { buildQaSummary, formatQaSummaryText } from "./reporters/summaryReporter";
