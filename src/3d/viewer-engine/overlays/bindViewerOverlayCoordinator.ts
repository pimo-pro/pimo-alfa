import type { UnifiedMeasurementEngine } from "../measurement/UnifiedMeasurementEngine";
import type { SmartAlignSnapEngine } from "../snapping/SmartAlignSnapEngine";
import type { SmartSnapping } from "../snapping/SmartSnapping";
import type { ViewerOverlayCoordinator } from "./ViewerOverlayCoordinator";

export type ViewerOverlayCoordinatorDeps = {
  coordinator: ViewerOverlayCoordinator;
  unifiedMeasurement: UnifiedMeasurementEngine;
  smartSnappingEngine: SmartSnapping;
  smartAlignSnapEngine: SmartAlignSnapEngine;
  syncSmartAlignSnapOverlay: () => void;
  clearSmartAlignSnapOverlay: () => void;
};

export function bindViewerOverlayCoordinator({
  coordinator,
  unifiedMeasurement,
  smartSnappingEngine,
  smartAlignSnapEngine,
  syncSmartAlignSnapOverlay,
  clearSmartAlignSnapOverlay,
}: ViewerOverlayCoordinatorDeps): void {
  coordinator.bind({
    syncRulerWithExternalSelectionMovement: () =>
      unifiedMeasurement.syncRulerWithExternalSelectionMovement(),
    clearRulerOverlayIfMovementIdle: (nowMs) =>
      unifiedMeasurement.clearRulerOverlayIfMovementIdle(nowMs),
    refreshMeasurement: () => unifiedMeasurement.refreshOverlay(),
    refreshSnapping: () => smartSnappingEngine.refreshOverlay(),
    refreshSmartAlignSnap: () => {
      smartAlignSnapEngine.refreshOverlay();
      syncSmartAlignSnapOverlay();
    },
    clearMovementRuler: () => unifiedMeasurement.clearMovementRuler(),
    clearSmartAlignSnap: clearSmartAlignSnapOverlay,
  });
}
