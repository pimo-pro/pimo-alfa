import type { SmartSnapping } from "./SmartSnapping";
import { getRoomRules, getSnapRules } from "./rulesRuntime";

type RulesSubscriptionStore = {
  subscribe: (_listener: () => void) => () => void;
};

export function applyAdminSnappingRules(engine: SmartSnapping): void {
  const snap = getSnapRules();
  const room = getRoomRules();
  engine.setCaptureRadius(snap.captureRadiusMm);
  engine.setMagnetStrength(snap.magnetStrength);
  engine.setGridSize(snap.gridSizeMm);
  engine.setWallOffset(room.wallOffsetMm);
}

export function registerAdminSnappingRules(
  engine: SmartSnapping,
  stores: {
    snapRules: RulesSubscriptionStore;
    roomRules: RulesSubscriptionStore;
  }
): () => void {
  const apply = () => applyAdminSnappingRules(engine);
  apply();
  const unsubscribeSnap = stores.snapRules.subscribe(apply);
  const unsubscribeRoom = stores.roomRules.subscribe(apply);
  return () => {
    unsubscribeSnap();
    unsubscribeRoom();
  };
}
