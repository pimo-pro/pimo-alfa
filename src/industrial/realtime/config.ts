import { industrialFeatureFlags } from '../config/featureFlags';

export const realtimeAlertsConfig = {
  taskDelayMinutes: 45,
  maxQueueSize: 12,
  rejectionLimitPercent: 15,
  reworkLimitPercent: 10,
  idleProductionMinutes: 30,
} as const;

/** RTO-Engine 1.0 activo quando a flag admin está ligada ou em desenvolvimento. */
export function isRtoEngineEnabled(): boolean {
  if (industrialFeatureFlags.realtimeTracking) return true;
  return import.meta.env.DEV;
}

export const RTO_HEARTBEAT_INTERVAL_MS = 5_000;
export const RTO_HEARTBEAT_TIMEOUT_MS = 10_000;
export const RTO_BROADCAST_CHANNEL = 'industrial:rto:broadcast';
