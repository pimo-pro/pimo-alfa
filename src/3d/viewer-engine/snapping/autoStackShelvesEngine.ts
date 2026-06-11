import type { AutoLayoutPlan, AutoStackShelvesOptions } from "../autoLayout/autoLayoutTypes";
import type { SmartLayoutEngineDeps } from "./smartLayoutTypes";

/**
 * Auto-Stack Shelves — prateleiras com espaçamento uniforme; refinamento interno opcional.
 */
export class AutoStackShelvesEngine {
  private readonly deps: SmartLayoutEngineDeps;

  constructor(deps: SmartLayoutEngineDeps) {
    this.deps = deps;
  }

  buildPlan(boxId: string, options: AutoStackShelvesOptions): AutoLayoutPlan | null {
    const bridge = this.deps.getBridge();
    if (!bridge) return null;
    const box = bridge.getWorkspaceBoxes().find((b) => b.id === boxId);
    if (!box || box.locked) return null;

    let count = Math.max(0, Math.floor(options.count));
    if (count <= 0) {
      const interior =
        box.dimensoes.altura - 2 * box.espessura - options.topMarginMm - options.bottomMarginMm;
      const spacing = Math.max(80, interior / 4);
      count = Math.max(1, Math.floor(interior / spacing));
    }

    return {
      cloneBoxes: [],
      moveBoxes: [],
      shelfUpdates: [{ boxId, count }],
    };
  }

  stackShelves(boxId: string, options: AutoStackShelvesOptions): boolean {
    const bridge = this.deps.getBridge();
    const plan = this.buildPlan(boxId, options);
    if (!bridge || !plan) return false;

    bridge.applyPlan(plan);

    if (this.deps.isSmartSnapEnabled()) {
      this.deps.refineBoxWithSmartSnap(boxId);
    }
    return true;
  }
}
