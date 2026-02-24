/**
 * Base do domínio de System Settings.
 * Mantido em stub até a implementação completa do módulo central.
 */

export interface SettingsSchema {
  locale: string;
  theme: "dark" | "light" | "system";
  autosaveEnabled: boolean;
}

export const DEFAULT_SETTINGS_SCHEMA: SettingsSchema = {
  locale: "pt-PT",
  theme: "dark",
  autosaveEnabled: true,
};

export function getSettings(): SettingsSchema {
  // TODO: Implementar persistência real (localStorage/API) quando o módulo for ativado.
  return DEFAULT_SETTINGS_SCHEMA;
}

export function saveSettings(_settings: SettingsSchema): { success: boolean; message: string } {
  // TODO: Implementar validação e persistência real quando o módulo for ativado.
  return {
    success: false,
    message: "System Settings ainda não implementado (stub).",
  };
}
