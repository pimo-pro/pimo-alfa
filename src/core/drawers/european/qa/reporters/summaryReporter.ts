/**
 * summaryReporter.ts — Resumo industrial do stress test Modelo B.
 */

import type { EuropeanQaScenarioResult, EuropeanQaSummary } from "../types";

function topN(counter: Map<string, number>, n: number): Array<{ message: string; count: number }> {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([message, count]) => ({ message, count }));
}

function bump(map: Map<string, { failures: number; total: number }>, key: string, failed: boolean) {
  const cur = map.get(key) ?? { failures: 0, total: 0 };
  cur.total += 1;
  if (failed) cur.failures += 1;
  map.set(key, cur);
}

export function buildQaSummary(results: EuropeanQaScenarioResult[]): EuropeanQaSummary {
  const ran = results.filter((r) => !r.skipped);
  const skipped = results.length - ran.length;
  const valid = ran.filter((r) => r.valid).length;
  const invalid = ran.filter((r) => !r.valid).length;
  const autoFixed = ran.filter((r) => r.autoFixed).length;
  const denom = Math.max(1, ran.length);

  const errCounter = new Map<string, number>();
  const warnCounter = new Map<string, number>();
  const byModel = new Map<string, { failures: number; total: number }>();
  const byDepth = new Map<string, { failures: number; total: number }>();
  const byWidth = new Map<string, { failures: number; total: number }>();

  for (const r of ran) {
    const failed = !r.valid;
    for (const e of r.errors) {
      errCounter.set(e, (errCounter.get(e) ?? 0) + 1);
    }
    for (const w of r.warnings) {
      warnCounter.set(w, (warnCounter.get(w) ?? 0) + 1);
    }
    bump(byModel, r.modelId ?? "unknown", failed);
    bump(byDepth, String(r.caixa.profundidadeInternaMm), failed);
    bump(byWidth, String(r.caixa.larguraInternaMm), failed);
  }

  const pct = (n: number) => Math.round((n / denom) * 1000) / 10;

  return {
    total: results.length,
    ran: ran.length,
    skipped,
    valid,
    invalid,
    autoFixed,
    pctValid: pct(valid),
    pctInvalid: pct(invalid),
    pctAutoFixed: pct(autoFixed),
    topErrors: topN(errCounter, 10),
    topWarnings: topN(warnCounter, 10),
    failuresByModel: [...byModel.entries()]
      .map(([modelId, v]) => ({ modelId, failures: v.failures, total: v.total }))
      .sort((a, b) => b.failures - a.failures || a.modelId.localeCompare(b.modelId)),
    failuresByDepth: [...byDepth.entries()]
      .map(([k, v]) => ({
        profundidadeInternaMm: Number(k),
        failures: v.failures,
        total: v.total,
      }))
      .sort((a, b) => b.failures - a.failures || a.profundidadeInternaMm - b.profundidadeInternaMm),
    failuresByWidth: [...byWidth.entries()]
      .map(([k, v]) => ({
        larguraInternaMm: Number(k),
        failures: v.failures,
        total: v.total,
      }))
      .sort((a, b) => b.failures - a.failures || a.larguraInternaMm - b.larguraInternaMm),
  };
}

export function formatQaSummaryText(summary: EuropeanQaSummary): string {
  const lines = [
    `Total: ${summary.total} (ran=${summary.ran}, skipped=${summary.skipped})`,
    `Válidos: ${summary.valid} (${summary.pctValid}%)`,
    `Inválidos: ${summary.invalid} (${summary.pctInvalid}%)`,
    `AutoFix: ${summary.autoFixed} (${summary.pctAutoFixed}%)`,
    "Top erros:",
    ...summary.topErrors.map((e) => `  - [${e.count}] ${e.message}`),
    "Top avisos:",
    ...summary.topWarnings.map((w) => `  - [${w.count}] ${w.message}`),
  ];
  return lines.join("\n");
}
