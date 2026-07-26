/**
 * consoleReporter.ts — Log legível por cenário.
 */

import type { EuropeanQaScenarioResult } from "../types";

export function formatScenarioConsoleLine(r: EuropeanQaScenarioResult): string {
  const state = r.skipped ? "SKIP" : r.valid ? "OK" : "FAIL";
  const auto = r.autoFixed ? " autoFix=yes" : "";
  return [
    r.scenarioId,
    state,
    `errors=${r.errors.length}`,
    `warnings=${r.warnings.length}`,
    `autoFixes=${r.autoFixes.length}${auto}`,
    `cutlist=${r.cutlistCount}`,
    `pdf=${r.pdfOk ? "ok" : "no"}`,
    `viewer=${r.viewerOk ? "ok" : "no"}`,
    `${r.durationMs}ms`,
  ].join(" | ");
}

export function reportConsole(results: EuropeanQaScenarioResult[]): void {
  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(formatScenarioConsoleLine(r));
  }
}
