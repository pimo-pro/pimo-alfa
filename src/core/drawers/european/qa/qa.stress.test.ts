import { describe, expect, it, vi } from "vitest";
import * as flags from "../../drawerSystemFlags";
import {
  ALL_SCENARIOS,
  buildEuropeanQaScenarios,
  buildQaSummary,
  runScenario,
  runStressTests,
  serializeQaResultsJson,
} from "./index";

describe("european/qa Auto QA", () => {
  it("gera ~200 cenários determinísticos", () => {
    expect(ALL_SCENARIOS.length).toBe(200);
    expect(buildEuropeanQaScenarios(200).length).toBe(200);
    expect(ALL_SCENARIOS[0]!.id).toBe("EU-QA-001");
    expect(ALL_SCENARIOS[0]!.gavetas.length).toBeGreaterThanOrEqual(1);
  });

  it("bloqueia execução se Modelo A activo", async () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(true);
    const r = await runScenario(ALL_SCENARIOS[0]!);
    expect(r.skipped).toBe(true);
    expect(r.valid).toBe(false);
    vi.restoreAllMocks();
  });

  it("corre amostra de stress tests com Modelo A off", async () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const sample = ALL_SCENARIOS.slice(0, 12);
    const results = await runStressTests({ scenarios: sample, yieldEvery: 2 });
    expect(results).toHaveLength(12);
    expect(results.every((r) => !r.skipped)).toBe(true);

    const summary = buildQaSummary(results);
    expect(summary.ran).toBe(12);
    expect(summary.pctValid + summary.pctInvalid).toBeCloseTo(100, 0);

    const json = serializeQaResultsJson(results, summary);
    expect(json).toContain("qa-results.json");
    expect(json).toContain(sample[0]!.id);

    vi.restoreAllMocks();
  });
});
