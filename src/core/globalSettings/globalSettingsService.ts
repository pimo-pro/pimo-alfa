/**
 * Camada de configuração global publicada no servidor (GET /config/global).
 * Ordem de merge no pipeline principal: defaults → global → user online → local → validateSettings.
 *
 * Extensão futura (UI admin): PATCH administrativo + edição de `api/data/global-settings.json`;
 * manter `GLOBAL_SETTINGS_LOCAL_ONLY_PATHS` alinhado com o que não deve ser publicado no documento global.
 */

import { getGlobalSettingsRemote, type GlobalSettingsRemoteResponse } from "../../api/globalSettingsApi";
import { deepMergeSettings, isObject } from "../settings/settingsMerge";
import { migrateSettings } from "../settings/settingsStorage";
import { SETTINGS_STORAGE_KEY, settingsDefaults, type SettingsSchema } from "../settings/settingsSchema";
import { validateSettings } from "../settings/settingsValidation";
import { devLogger } from "../../utils/devLogger";

/** Caminhos (notação `secção.campo`) que o JSON global não pode sobrepor — ficam para o dispositivo/local. */
export const GLOBAL_SETTINGS_LOCAL_ONLY_PATHS: readonly string[] = ["geral.theme"];

function readLocalStorageRaw(): unknown {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as unknown;
  } catch {
    return {};
  }
}

/**
 * Remove chaves “local only” do patch global antes do merge (ex.: tema por dispositivo).
 */
export function stripLocalOnlyFromGlobalPatch(patch: Record<string, unknown>): Record<string, unknown> {
  let cloned: Record<string, unknown>;
  try {
    cloned = JSON.parse(JSON.stringify(patch)) as Record<string, unknown>;
  } catch {
    return patch;
  }
  for (const dotPath of GLOBAL_SETTINGS_LOCAL_ONLY_PATHS) {
    const keys = dotPath.split(".").filter(Boolean);
    if (keys.length === 0) continue;
    let cur: Record<string, unknown> | undefined = cloned;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      const next = cur?.[k];
      if (!isObject(next)) {
        cur = undefined;
        break;
      }
      cur = next as Record<string, unknown>;
    }
    if (!cur) continue;
    const last = keys[keys.length - 1];
    if (last in cur) delete cur[last];
  }
  return cloned;
}

export function mergeGlobalSettingsWithDefaults(
  globalPartial: Record<string, unknown> | null
): SettingsSchema {
  if (!globalPartial || !isObject(globalPartial) || Object.keys(globalPartial).length === 0) {
    return settingsDefaults;
  }
  const stripped = stripLocalOnlyFromGlobalPatch(globalPartial);
  return deepMergeSettings(settingsDefaults, stripped);
}

export function validateGlobalSettings(doc: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!isObject(doc)) {
    errors.push("documento não é objeto");
    return { valid: false, errors };
  }
  const d = doc as Record<string, unknown>;
  // Documento vazio ou sem status → tratado como ok (ficheiro placeholder)
  if (Object.keys(d).length === 0) {
    return { valid: true, errors: [] };
  }
  if (d.status != null && d.status !== "ok") errors.push('status deve ser "ok"');
  if (d.version != null && (typeof d.version !== "string" || d.version.trim() === "")) {
    errors.push("version inválida");
  }
  if (d.settings != null) {
    if (!isObject(d.settings)) {
      errors.push("settings deve ser objeto (não array)");
    }
  }
  return { valid: errors.length === 0, errors };
}

export async function fetchGlobalSettings(): Promise<Record<string, unknown> | null> {
  const raw = await getGlobalSettingsRemote();
  if (!raw) {
    if (import.meta.env.DEV) {
      devLogger.info("[PIMO][globalSettings] GET /config/global: sem dados (rede ou vazio)");
    }
    return null;
  }
  const v = validateGlobalSettings(raw as GlobalSettingsRemoteResponse);
  if (!v.valid) {
    // Não lançar: log + fallback (ficheiro vazio / placeholder não deve partir o arranque)
    if (import.meta.env.DEV) {
      devLogger.warn("[PIMO][globalSettings] documento inválido — a ignorar:", v.errors);
    }
    return null;
  }
  if (import.meta.env.DEV) {
    devLogger.info("[PIMO][globalSettings] carregado", raw.version, raw.updatedAt ?? "—");
  }
  const s = raw.settings;
  if (!isObject(s)) return null;
  // settings {} é válido — devolve objeto vazio (pipeline trata como sem override)
  return s;
}

/**
 * Merge: defaults → global (sem local-only) → user online → local (migrateSettings) → validateSettings.
 */
export function resolveAllSettingsLayers(
  globalPartial: Record<string, unknown> | null,
  onlinePartial: Record<string, unknown> | null
): SettingsSchema {
  let base = settingsDefaults;

  if (globalPartial && isObject(globalPartial) && Object.keys(globalPartial).length > 0) {
    base = deepMergeSettings(base, stripLocalOnlyFromGlobalPatch(globalPartial));
  }

  if (onlinePartial && isObject(onlinePartial) && Object.keys(onlinePartial).length > 0) {
    base = deepMergeSettings(base, onlinePartial);
  }

  const localMigrated = migrateSettings(readLocalStorageRaw());
  base = deepMergeSettings(base, localMigrated);

  return validateSettings(base).normalized;
}
