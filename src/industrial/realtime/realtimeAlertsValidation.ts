import { realtimeAlertsConfig } from './config';

export type RealtimeAlertsConfig = {
  taskDelayMinutes: number;
  maxQueueSize: number;
  rejectionLimitPercent: number;
  reworkLimitPercent: number;
  idleProductionMinutes: number;
};

export const REALTIME_ALERTS_SETTINGS_KEY = 'industrial.realtime_alerts';

export const REALTIME_ALERTS_LIMITS = {
  taskDelayMinutes: { min: 5, max: 480 },
  maxQueueSize: { min: 1, max: 500 },
  rejectionLimitPercent: { min: 1, max: 100 },
  reworkLimitPercent: { min: 1, max: 100 },
  idleProductionMinutes: { min: 5, max: 1440 },
} as const;

export interface RealtimeAlertsValidationResult {
  valid: boolean;
  normalized: RealtimeAlertsConfig;
  errors: string[];
}

function clampField(
  value: unknown,
  field: keyof RealtimeAlertsConfig,
  errors: string[],
): number {
  const limits = REALTIME_ALERTS_LIMITS[field];
  const fallback = realtimeAlertsConfig[field];
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    errors.push(`${field}: valor inválido.`);
    return fallback;
  }
  if (num < limits.min || num > limits.max) {
    errors.push(`${field}: deve estar entre ${limits.min} e ${limits.max}.`);
    return Math.min(limits.max, Math.max(limits.min, num));
  }
  return Math.round(num);
}

export function validateRealtimeAlertsConfig(
  input: Partial<RealtimeAlertsConfig> | null | undefined,
): RealtimeAlertsValidationResult {
  const errors: string[] = [];
  const normalized: RealtimeAlertsConfig = {
    taskDelayMinutes: clampField(input?.taskDelayMinutes, 'taskDelayMinutes', errors),
    maxQueueSize: clampField(input?.maxQueueSize, 'maxQueueSize', errors),
    rejectionLimitPercent: clampField(input?.rejectionLimitPercent, 'rejectionLimitPercent', errors),
    reworkLimitPercent: clampField(input?.reworkLimitPercent, 'reworkLimitPercent', errors),
    idleProductionMinutes: clampField(input?.idleProductionMinutes, 'idleProductionMinutes', errors),
  };
  return { valid: errors.length === 0, normalized, errors };
}

export function mergeRealtimeAlertsConfig(
  partial: Partial<RealtimeAlertsConfig> | null | undefined,
): RealtimeAlertsConfig {
  return validateRealtimeAlertsConfig({ ...realtimeAlertsConfig, ...partial }).normalized;
}
