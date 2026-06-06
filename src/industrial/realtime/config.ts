import { industrialAdminFeatureFlags } from '@/app/admin/settings/industrial/feature-flags';

export const realtimeAlertsConfig = {
  taskDelayMinutes: 45,
  maxQueueSize: 12,
  rejectionLimitPercent: 15,
  reworkLimitPercent: 10,
  idleProductionMinutes: 30,
} as const;

/** RTO-Engine 1.0 activo quando a flag admin está ligada ou em desenvolvimento. */
export function isRtoEngineEnabled(): boolean {
  if (industrialAdminFeatureFlags.realtimeTracking) return true;
  return import.meta.env.DEV;
}

export const RTO_HEARTBEAT_INTERVAL_MS = 5_000;
export const RTO_HEARTBEAT_TIMEOUT_MS = 10_000;
export const RTO_BROADCAST_CHANNEL = 'industrial:rto:broadcast';
