/**
 * Persistência local (localStorage), migração e leitura de configurações.
 */

import { SETTINGS_SCHEMA_VERSION, SETTINGS_STORAGE_KEY, settingsDefaults, type SettingsSchema } from "./settingsSchema";
import { deepMergeSettings, isObject } from "./settingsMerge";
import { validateSettings } from "./settingsValidation";

/** Snapshot injetado no Worker industrial (localStorage não está disponível de forma fiável no Worker). */
let settingsReadOverride: SettingsSchema | null = null;

/** @internal Apenas `industrialGeneration.worker` / runner; não usar na UI. */
export function setIndustrialSettingsReadOverride(s: SettingsSchema | null): void {
  settingsReadOverride = s;
}

export function migrateSettings(raw: unknown): SettingsSchema {
  if (!isObject(raw)) return settingsDefaults;
  const rawObj = raw as Record<string, unknown>;
  const rawFabrica = isObject(rawObj.fabrica) ? (rawObj.fabrica as Record<string, unknown>) : {};
  const rawMateriais = isObject(rawObj.materiais) ? (rawObj.materiais as Record<string, unknown>) : {};
  const migratedMateriais: Record<string, unknown> = { ...rawMateriais };
  if (migratedMateriais.sheetWidthMm == null && rawFabrica.larguraChapaPadraoMm != null) {
    migratedMateriais.sheetWidthMm = rawFabrica.larguraChapaPadraoMm;
  }
  if (migratedMateriais.sheetHeightMm == null && rawFabrica.alturaChapaPadraoMm != null) {
    migratedMateriais.sheetHeightMm = rawFabrica.alturaChapaPadraoMm;
  }
  if (migratedMateriais.sheetThicknessMm == null && rawFabrica.espessuraPadraoMm != null) {
    migratedMateriais.sheetThicknessMm = rawFabrica.espessuraPadraoMm;
  }
  const patched = deepMergeSettings(settingsDefaults, { ...rawObj, materiais: migratedMateriais });
  // Reservado para futuras versões de schema.
  return validateSettings({ ...patched, schemaVersion: SETTINGS_SCHEMA_VERSION }).normalized;
}

export function getSettings(): SettingsSchema {
  if (settingsReadOverride) return settingsReadOverride;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return settingsDefaults;
    const parsed = JSON.parse(raw) as unknown;
    return migrateSettings(parsed);
  } catch {
    return settingsDefaults;
  }
}

/** Configuração global de furação (parafuso/cavilha). Usada pelo drillingAdapter e pela UI; aplicada a todos os projetos. */
export function getDrillingConfig(): SettingsSchema["furação"] {
  return getSettings().furação;
}

export function saveSettings(settings: Partial<SettingsSchema> | SettingsSchema): {
  success: boolean;
  message: string;
  settings: SettingsSchema;
  errors: string[];
} {
  const result = validateSettings(settings);
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(result.normalized));
    return {
      success: result.valid,
      message: result.valid
        ? "Configurações guardadas com sucesso."
        : "Configurações guardadas com ajustes de validação.",
      settings: result.normalized,
      errors: result.errors,
    };
  } catch {
    return {
      success: false,
      message: "Falha ao guardar configurações no armazenamento local.",
      settings: result.normalized,
      errors: ["Erro de persistência localStorage."],
    };
  }
}
