import type { ViewerBoxEntry } from "../types";
import type { InternalSelectionState } from "../selection";
import {
  computeBoxCavityBoundsLocal,
  computeInternalCavityMeasurements,
} from "../selection/boxCavityBounds";
import type { InternalRulerOverlay } from "./InternalRulerOverlay";

export type InternalRulerOverlaySyncState = {
  enabled: boolean;
  selection: InternalSelectionState | null;
  boxes: Map<string, ViewerBoxEntry>;
  overlay: InternalRulerOverlay | null;
};

export function syncInternalRulerOverlay({
  enabled,
  selection,
  boxes,
  overlay,
}: InternalRulerOverlaySyncState): void {
  if (!overlay) return;
  if (!enabled || !selection) {
    overlay.sync(null, null, null);
    return;
  }
  const entry = boxes.get(selection.boxId);
  if (!entry) {
    overlay.sync(null, null, null);
    return;
  }
  const bounds = computeBoxCavityBoundsLocal(entry);
  const measurements = computeInternalCavityMeasurements(selection.boxId, entry);
  overlay.sync(selection, measurements, bounds);
}
