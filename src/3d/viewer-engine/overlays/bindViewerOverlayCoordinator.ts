import type { InternalRuler } from "../measurement/InternalRuler";
import type { ViewerMeasurementOverlay } from "../measurement/ViewerMeasurementOverlay";
import type { SmartSnapping } from "../snapping/SmartSnapping";
import type { ViewerOverlayCoordinator } from "./ViewerOverlayCoordinator";

export type ViewerOverlayCoordinatorDeps = {
  coordinator: ViewerOverlayCoordinator;
  measurementOverlay: ViewerMeasurementOverlay;
  internalRulerEngine: InternalRuler;
  smartSnappingEngine: SmartSnapping;
  refreshInternalRulerOverlay: () => void;
  clearSmartAlignSnapOverlay: () => void;
};

export function bindViewerOverlayCoordinator({
  coordinator,
  measurementOverlay,
  internalRulerEngine,
  smartSnappingEngine,
  refreshInternalRulerOverlay,
  clearSmartAlignSnapOverlay,
}: ViewerOverlayCoordinatorDeps): void {
  coordinator.bind({
    syncRulerWithExternalSelectionMovement: () =>
      measurementOverlay.syncRulerWithExternalSelectionMovement(),
    clearRulerOverlayIfMovementIdle: (nowMs) =>
      measurementOverlay.clearRulerOverlayIfMovementIdle(nowMs),
    refreshInternalRuler: () => internalRulerEngine.refreshOverlay(),
    refreshInternalRulerOverlay,
    refreshSnapping: () => smartSnappingEngine.refreshOverlay(),
    refreshSmartAlignSnap: clearSmartAlignSnapOverlay,
    clearMovementRuler: () => measurementOverlay.clearRulerOverlay(),
    clearSmartAlignSnap: clearSmartAlignSnapOverlay,
  });
}
