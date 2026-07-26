import { describe, expect, it, vi, afterEach } from "vitest";
import * as flags from "../drawers/drawerSystemFlags";
import { buildKitchenLibrary } from "../kitchen";
import { createPlannerState, plannerAddModule } from "./plannerState";
import { buildPlannerPricing } from "./plannerPricing";

describe("planner/plannerPricing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("consome pricing da library sem recalcular industrial", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const lib = buildKitchenLibrary();
    expect(lib.pricing).toBeTruthy();

    let state = createPlannerState({ library: lib });
    expect(state.pricing.source).toBe("library-pricing");
    expect(state.pricing.priceFinal).toBe(0);

    state = plannerAddModule(state, "base-600", { xMm: 0, yMm: 0 });
    state = plannerAddModule(state, "base-800", { xMm: 600, yMm: 0 });

    expect(state.pricing.moduleCount).toBe(2);
    expect(state.pricing.priceFinal).toBe(
      Math.round(state.pricing.pricePerModule * 2 * 100) / 100
    );
    expect(state.pricing.costIndustrial).toBeGreaterThan(0);
    expect(state.pricing.priceFinal).toBeGreaterThanOrEqual(state.pricing.costIndustrial);

    const empty = buildPlannerPricing([], null);
    expect(empty.source).toBe("empty");
  });
});
