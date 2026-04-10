/**
 * User settings online — pipeline de merge e sync remoto (fila simples).
 * Visitantes: não chamar fetch/patch; apenas getSettings() / saveSettings() existentes.
 */

import { patchUserSettingsRemote, getUserSettingsRemote } from "../../api/userSettingsApi";
import { resolveAllSettingsLayers } from "../globalSettings/globalSettingsService";
import { deepMergeSettings, isObject } from "../settings/settingsMerge";
import { settingsDefaults, type SettingsSchema } from "../settings/settingsSchema";
import { validateSettings } from "../settings/settingsValidation";

const USER_SETTINGS_SYNC_QUEUE_KEY = "pimo_user_settings_remote_queue_v1";

type DeepPartialSettings = {
  [K in keyof SettingsSchema]?: SettingsSchema[K] extends (infer U)[]
    ? U[]
    : SettingsSchema[K] extends object
      ? DeepPartialNested<SettingsSchema[K]>
      : SettingsSchema[K];
};

type DeepPartialNested<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? U[]
    : T[K] extends object
      ? DeepPartialNested<T[K]>
      : T[K];
};

function readQueue(): DeepPartialSettings[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(USER_SETTINGS_SYNC_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as DeepPartialSettings[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(entries: DeepPartialSettings[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (entries.length === 0) {
      localStorage.removeItem(USER_SETTINGS_SYNC_QUEUE_KEY);
      return;
    }
    localStorage.setItem(USER_SETTINGS_SYNC_QUEUE_KEY, JSON.stringify(entries));
  } catch {
    /* quota — manter fila em memória seria mais complexo; falha silenciosa */
  }
}

/**
 * Pipeline: defaults → global (servidor) → user online → local — já com `validateSettings` no fim.
 * @param globalPartial — resultado de `fetchGlobalSettings()` ou `null` se falhou o GET.
 */
export function mergeUserSettingsWithLocal(
  onlinePartial: Record<string, unknown> | null,
  globalPartial?: Record<string, unknown> | null
): SettingsSchema {
  return resolveAllSettingsLayers(globalPartial ?? null, onlinePartial);
}

/** Inclui camada global quando `globalPartial` é passado (ex.: arranque após GET /config/global). */
export function resolveUserSettingsPipeline(
  onlinePartial: Record<string, unknown> | null,
  globalPartial?: Record<string, unknown> | null
): SettingsSchema {
  return resolveAllSettingsLayers(globalPartial ?? null, onlinePartial);
}

/** Reexport — SettingsProvider pode importar só deste módulo. */
export { fetchGlobalSettings } from "../globalSettings/globalSettingsService";

/** GET /user/settings — devolve `settings` ou null se o servidor não tiver documento. */
export async function fetchUserSettings(): Promise<Record<string, unknown> | null> {
  const res = await getUserSettingsRemote();
  const s = res.settings;
  if (s === null || s === undefined) return null;
  return isObject(s) ? s : null;
}

/**
 * PATCH agregado na fila; falhas de rede não limpam a fila.
 * Envia merge(validated) de todos os patches em fila + defaults como base.
 */
export async function flushUserSettingsRemoteQueue(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const queue = readQueue();
  if (queue.length === 0) return;

  let combined = settingsDefaults;
  for (const patch of queue) {
    combined = deepMergeSettings(combined, patch as Record<string, unknown>);
  }
  const normalized = validateSettings(combined).normalized;
  try {
    await patchUserSettingsRemote(normalized as unknown as Record<string, unknown>);
    writeQueue([]);
  } catch {
    /* mantém fila para retry */
  }
}

/** Acrescenta patch à fila e tenta envio imediato (best-effort). */
export function scheduleUserSettingsRemotePatch(patch: DeepPartialSettings): void {
  const next = [...readQueue(), patch];
  writeQueue(next);
  void flushUserSettingsRemoteQueue();
}

/** Expõe merge + PATCH directo (testes ou sync manual). */
export async function saveUserSettings(payload: Record<string, unknown>): Promise<void> {
  await patchUserSettingsRemote(payload);
}
