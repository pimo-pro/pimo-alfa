/**
 * stressTestRunner.ts — Loop de stress tests Modelo B.
 */

import { ALL_SCENARIOS } from "./scenarios";
import { runScenario } from "./runScenario";
import type {
  EuropeanQaProgress,
  EuropeanQaScenario,
  EuropeanQaScenarioResult,
} from "./types";

export type RunStressTestsOptions = {
  scenarios?: readonly EuropeanQaScenario[];
  /** Callback por cenário (UI progresso). */
  onProgress?: (_p: EuropeanQaProgress) => void;
  /** Yield ao event loop a cada N cenários (default 5). */
  yieldEvery?: number;
};

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof setTimeout !== "undefined") setTimeout(resolve, 0);
    else resolve();
  });
}

/**
 * Executa todos os cenários QA (simulação interna).
 * Não altera projeto, não chama CNC, não escreve industrial/**.
 */
export async function runStressTests(
  options: RunStressTestsOptions = {}
): Promise<EuropeanQaScenarioResult[]> {
  const scenarios = options.scenarios ?? ALL_SCENARIOS;
  const yieldEvery = Math.max(1, options.yieldEvery ?? 5);
  const results: EuropeanQaScenarioResult[] = [];

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i]!;
    const result = await runScenario(scenario);
    results.push(result);
    options.onProgress?.({
      index: i + 1,
      total: scenarios.length,
      scenarioId: scenario.id,
      result,
    });
    if ((i + 1) % yieldEvery === 0) {
      await yieldToMain();
    }
  }

  return results;
}
