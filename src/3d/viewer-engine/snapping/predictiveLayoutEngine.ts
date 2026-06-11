import * as THREE from "three";
import { mmToM } from "../../../utils/units";
import type { AutoLayoutPlan } from "../autoLayout/autoLayoutTypes";
import type { PredictiveLayoutPreview, SmartLayoutEngineDeps } from "./smartLayoutTypes";
import type { SmartAlignSnapOverlayState } from "./smartAlignSnapOverlay";

/**
 * Predictive Layout — prevê posições antes de aplicar; overlay de layout sugerido.
 */
export type DesignPreviewEntry = {
  id: string;
  preview: PredictiveLayoutPreview;
};

export class PredictiveLayoutEngine {
  private pending: PredictiveLayoutPreview | null = null;
  private designPreviews: DesignPreviewEntry[] = [];
  private activeDesignIndex = 0;
  private readonly deps: SmartLayoutEngineDeps;

  constructor(deps: SmartLayoutEngineDeps) {
    this.deps = deps;
  }

  getPending(): PredictiveLayoutPreview | null {
    return this.pending;
  }

  clearPending(): void {
    this.pending = null;
    this.designPreviews = [];
    this.activeDesignIndex = 0;
  }

  previewDesigns(entries: Array<{ id: string; plan: import("../autoLayout/autoLayoutTypes").AutoLayoutPlan; label: string }>): DesignPreviewEntry[] {
    this.designPreviews = entries.map((e) => ({
      id: e.id,
      preview: this.previewPlan(e.plan, e.label),
    }));
    this.activeDesignIndex = 0;
    if (this.designPreviews[0]) {
      this.pending = this.designPreviews[0].preview;
    }
    return this.designPreviews;
  }

  getDesignPreviews(): DesignPreviewEntry[] {
    return this.designPreviews;
  }

  showDesignPreview(index: number): SmartAlignSnapOverlayState | null {
    const entry = this.designPreviews[index];
    if (!entry) return null;
    this.activeDesignIndex = index;
    this.pending = entry.preview;
    return this.buildOverlayState(entry.preview);
  }

  showDesignById(id: string): SmartAlignSnapOverlayState | null {
    const idx = this.designPreviews.findIndex((d) => d.id === id);
    return idx >= 0 ? this.showDesignPreview(idx) : null;
  }

  getActiveDesignIndex(): number {
    return this.activeDesignIndex;
  }

  previewPlan(plan: AutoLayoutPlan, label: string): PredictiveLayoutPreview {
    const guides: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];

    for (const move of plan.moveBoxes) {
      const current = this.deps.getBoxWorldPosition(move.boxId);
      const target = new THREE.Vector3(
        mmToM(move.placement.x_mm),
        mmToM(move.placement.y_mm),
        mmToM(move.placement.z_mm)
      );
      if (current) {
        guides.push({ start: current.clone(), end: target });
      }
    }

    for (const clone of plan.cloneBoxes) {
      const source = this.deps.getBoxWorldPosition(clone.sourceId);
      const target = new THREE.Vector3(
        mmToM(clone.placement.x_mm),
        mmToM(clone.placement.y_mm),
        mmToM(clone.placement.z_mm)
      );
      if (source) {
        guides.push({ start: source.clone(), end: target });
      } else {
        guides.push({ start: target.clone(), end: target.clone().add(new THREE.Vector3(0, 0.1, 0)) });
      }
    }

    const preview: PredictiveLayoutPreview = { plan, guides, label };
    this.pending = preview;
    return preview;
  }

  buildOverlayState(preview: PredictiveLayoutPreview): SmartAlignSnapOverlayState {
    return {
      visible: true,
      mode: "predictive",
      guides: preview.guides,
      label: preview.label,
      snapPoint: preview.guides[0]?.end,
    };
  }

  applyPending(): boolean {
    const bridge = this.deps.getBridge();
    if (!bridge || !this.pending) return false;
    bridge.applyPlan(this.pending.plan);
    if (this.deps.isSmartSnapEnabled()) {
      for (const m of this.pending.plan.moveBoxes) {
        this.deps.refineBoxWithSmartSnap(m.boxId);
      }
    }
    this.pending = null;
    return true;
  }

  rejectPending(): void {
    this.pending = null;
  }
}

export type PredictiveLayoutResult = {
  preview: PredictiveLayoutPreview;
  overlay: SmartAlignSnapOverlayState;
};

export function buildPredictiveLayoutResult(
  engine: PredictiveLayoutEngine,
  plan: AutoLayoutPlan,
  label: string
): PredictiveLayoutResult {
  const preview = engine.previewPlan(plan, label);
  return { preview, overlay: engine.buildOverlayState(preview) };
}
