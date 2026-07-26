import { describe, expect, it, beforeEach, vi } from "vitest";
import * as flags from "../drawers/drawerSystemFlags";
import { buildKitchenLibrary } from "../kitchen";
import { buildPlannerGrid } from "./plannerGrid";
import { buildPlacementRules } from "./plannerPlacement";
import {
  addModuleToPlan,
  detectCollisions,
  findModuleSpec,
  resetPlannerInstanceSeqForTests,
} from "./plannerModules";
import { createPlannerState, plannerAddModule, plannerAutoAlign } from "./plannerState";

describe("planner/plannerModules", () => {
  beforeEach(() => {
    resetPlannerInstanceSeqForTests();
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
  });

  it("adiciona módulos e detecta colisões", () => {
    const lib = buildKitchenLibrary();
    const grid = buildPlannerGrid();
    const rules = buildPlacementRules({ rodape: lib.rodape });
    const spec = findModuleSpec(lib.modules.all, "base-600");
    expect(spec).toBeTruthy();

    const first = addModuleToPlan([], spec!, { xMm: 0, yMm: 0 }, grid, rules);
    expect(first.modules).toHaveLength(1);

    const overlap = addModuleToPlan(
      first.modules,
      spec!,
      { xMm: 100, yMm: 0 },
      grid,
      rules
    );
    expect(overlap.warning).toBeTruthy();
    expect(overlap.modules).toHaveLength(1);

    const beside = addModuleToPlan(
      first.modules,
      findModuleSpec(lib.modules.all, "base-400")!,
      { xMm: 600, yMm: 0 },
      grid,
      rules
    );
    expect(beside.modules).toHaveLength(2);
    expect(detectCollisions(beside.modules)).toHaveLength(0);
  });

  it("estado planner alinha base e reporta", () => {
    let state = createPlannerState({ library: buildKitchenLibrary() });
    state = plannerAddModule(state, "base-600", { xMm: 100, yMm: 0 });
    state = plannerAddModule(state, "base-400", { xMm: 900, yMm: 0 });
    expect(state.modules.length).toBe(2);
    state = plannerAutoAlign(state);
    expect(state.modules[0].xMm).toBe(0);
    expect(["PLANNER_OK", "PLANNER_WARN"]).toContain(state.report.status);
    expect(state.report.industrialIntegrityOk).toBe(true);
  });
});
