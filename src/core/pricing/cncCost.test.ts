import { describe, expect, it } from "vitest";
import { calculateCncCost, DEFAULT_CNC_COST_CONFIG } from "./cncCost";

describe("pricing/cncCost", () => {
  it("calcula CUT/DRILL/toolChange/machine time", () => {
    const cost = calculateCncCost({ cutOps: 20, drillOps: 40 }, DEFAULT_CNC_COST_CONFIG);
    expect(cost.cutOps).toBe(20);
    expect(cost.drillOps).toBe(40);
    expect(cost.toolChanges).toBeGreaterThanOrEqual(1);
    expect(cost.cutCost).toBeGreaterThan(0);
    expect(cost.drillCost).toBeGreaterThan(0);
    expect(cost.machineTimeCost).toBeGreaterThan(0);
    expect(cost.totalCost).toBe(
      Math.round(
        (cost.cutCost + cost.drillCost + cost.toolChangeCost + cost.machineTimeCost) * 100
      ) / 100
    );
  });

  it("sem drills => sem tool changes", () => {
    const cost = calculateCncCost({ cutOps: 8, drillOps: 0 });
    expect(cost.toolChanges).toBe(0);
    expect(cost.toolChangeCost).toBe(0);
  });
});
