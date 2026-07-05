import type { SmartSnapping } from "./SmartSnapping";
import type { SmartAlignSnapEngine } from "./SmartAlignSnapEngine";
import { DEFAULT_UNIFIED_CAPTURE_MM, DEFAULT_UNIFIED_LERP, DEFAULT_UNIFIED_MAGNET } from "./smartAlignSnapTypes";
import { getRoomRules, getSnapRules } from "./rulesRuntime";

type RulesSubscriptionStore = {
  subscribe: (_listener: () => void) => () => void;
};

export function applyAdminSnappingRules(
  engine: SmartSnapping,
  alignEngine?: SmartAlignSnapEngine
): void {
  const snap = getSnapRules();
  const room = getRoomRules();
  engine.setCaptureRadius(snap.captureRadiusMm);
  engine.setMagnetStrength(snap.magnetStrength);
  engine.setGridSize(snap.gridSizeMm);
  engine.setWallOffset(room.wallOffsetMm);
  if (alignEngine) {
    alignEngine.setCaptureRadius(DEFAULT_UNIFIED_CAPTURE_MM);
    alignEngine.setMagnetStrength(DEFAULT_UNIFIED_MAGNET);
    alignEngine.setLerpFactor(DEFAULT_UNIFIED_LERP);
  }
}

export function registerAdminSnappingRules(
  engine: SmartSnapping,
  stores: {
    snapRules: RulesSubscriptionStore;
    roomRules: RulesSubscriptionStore;
  },
  alignEngine?: SmartAlignSnapEngine
): () => void {
  const apply = () => applyAdminSnappingRules(engine, alignEngine);
  apply();
  const unsubscribeSnap = stores.snapRules.subscribe(apply);
  const unsubscribeRoom = stores.roomRules.subscribe(apply);
  return () => {
    unsubscribeSnap();
    unsubscribeRoom();
  };
}
