import { supabase } from '@/industrial/infra/db';

import { realtimeAlertsConfig } from './config';
import {
  mergeRealtimeAlertsConfig,
  REALTIME_ALERTS_SETTINGS_KEY,
  validateRealtimeAlertsConfig,
  type RealtimeAlertsConfig,
} from './realtimeAlertsValidation';

const SYSTEM_SETTINGS_TABLE = 'system_settings';

let activeConfig: RealtimeAlertsConfig = { ...realtimeAlertsConfig };
let loadPromise: Promise<RealtimeAlertsConfig> | null = null;

export function getRealtimeAlertsConfig(): RealtimeAlertsConfig {
  return activeConfig;
}

export function setRealtimeAlertsConfigLocal(config: RealtimeAlertsConfig): void {
  activeConfig = { ...config };
}

export async function loadRealtimeAlertsConfig(): Promise<RealtimeAlertsConfig> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from(SYSTEM_SETTINGS_TABLE)
        .select('value')
        .eq('key', REALTIME_ALERTS_SETTINGS_KEY)
        .maybeSingle();

      if (error) throw error;

      const stored = (data?.value ?? null) as Partial<RealtimeAlertsConfig> | null;
      activeConfig = mergeRealtimeAlertsConfig(stored);
    } catch {
      activeConfig = { ...realtimeAlertsConfig };
    }
    return activeConfig;
  })();

  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

export async function saveRealtimeAlertsConfig(
  input: Partial<RealtimeAlertsConfig>,
): Promise<{ success: boolean; config: RealtimeAlertsConfig; errors: string[] }> {
  const validation = validateRealtimeAlertsConfig({ ...activeConfig, ...input });
  activeConfig = validation.normalized;

  try {
    const { error } = await supabase.from(SYSTEM_SETTINGS_TABLE).upsert(
      {
        key: REALTIME_ALERTS_SETTINGS_KEY,
        value: validation.normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    );
    if (error) throw error;
    return { success: validation.valid, config: validation.normalized, errors: validation.errors };
  } catch (err) {
    return {
      success: false,
      config: validation.normalized,
      errors: [err instanceof Error ? err.message : 'Falha ao guardar configuração.'],
    };
  }
}

export function resetRealtimeAlertsConfigCache(): void {
  activeConfig = { ...realtimeAlertsConfig };
  loadPromise = null;
}
