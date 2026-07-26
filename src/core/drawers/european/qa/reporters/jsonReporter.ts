/**
 * jsonReporter.ts — Serializa resultados para qa-results.json (download / blob).
 * Não escreve no disco do projeto nem em industrial/**.
 */

import type { EuropeanQaScenarioResult, EuropeanQaSummary } from "../types";

export type EuropeanQaJsonPayload = {
  generatedAt: string;
  fileName: string;
  results: EuropeanQaScenarioResult[];
  summary?: EuropeanQaSummary;
};

export const QA_RESULTS_FILENAME = "qa-results.json";

export function buildQaResultsJson(
  results: EuropeanQaScenarioResult[],
  summary?: EuropeanQaSummary
): EuropeanQaJsonPayload {
  return {
    generatedAt: new Date().toISOString(),
    fileName: QA_RESULTS_FILENAME,
    results,
    summary,
  };
}

export function serializeQaResultsJson(
  results: EuropeanQaScenarioResult[],
  summary?: EuropeanQaSummary
): string {
  return JSON.stringify(buildQaResultsJson(results, summary), null, 2);
}

/** Cria Blob para download no browser. */
export function createQaResultsBlob(
  results: EuropeanQaScenarioResult[],
  summary?: EuropeanQaSummary
): Blob {
  return new Blob([serializeQaResultsJson(results, summary)], {
    type: "application/json;charset=utf-8",
  });
}

/** Dispara download de qa-results.json no browser (sem tocar no projeto). */
export function downloadQaResultsJson(
  results: EuropeanQaScenarioResult[],
  summary?: EuropeanQaSummary
): void {
  if (typeof document === "undefined") return;
  const blob = createQaResultsBlob(results, summary);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = QA_RESULTS_FILENAME;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
