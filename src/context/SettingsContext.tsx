import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  getSettings,
  saveSettings,
  validateSettings,
  type SettingsSchema,
} from "../core/settings/settingsService";

type SettingsContextValue = {
  settings: SettingsSchema;
  refreshSettings: () => void;
  updateSettings: (patch: Partial<SettingsSchema>) => {
    success: boolean;
    message: string;
    settings: SettingsSchema;
    errors: string[];
  };
  validate: (patch: Partial<SettingsSchema>) => {
    valid: boolean;
    errors: string[];
    normalized: SettingsSchema;
  };
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsSchema>(() => getSettings());

  const refreshSettings = useCallback(() => {
    setSettings(getSettings());
  }, []);

  const updateSettings = useCallback((patch: Partial<SettingsSchema>) => {
    const merged = {
      ...settings,
      ...patch,
      geral: { ...settings.geral, ...(patch.geral ?? {}) },
      fabrica: { ...settings.fabrica, ...(patch.fabrica ?? {}) },
      precos: { ...settings.precos, ...(patch.precos ?? {}) },
      materiais: { ...settings.materiais, ...(patch.materiais ?? {}) },
      cnc: { ...settings.cnc, ...(patch.cnc ?? {}) },
      nesting: { ...settings.nesting, ...(patch.nesting ?? {}) },
      viewer: { ...settings.viewer, ...(patch.viewer ?? {}) },
    };
    const result = saveSettings(merged);
    setSettings(result.settings);
    return result;
  }, [settings]);

  const validate = useCallback((patch: Partial<SettingsSchema>) => {
    const merged = {
      ...settings,
      ...patch,
      geral: { ...settings.geral, ...(patch.geral ?? {}) },
      fabrica: { ...settings.fabrica, ...(patch.fabrica ?? {}) },
      precos: { ...settings.precos, ...(patch.precos ?? {}) },
      materiais: { ...settings.materiais, ...(patch.materiais ?? {}) },
      cnc: { ...settings.cnc, ...(patch.cnc ?? {}) },
      nesting: { ...settings.nesting, ...(patch.nesting ?? {}) },
      viewer: { ...settings.viewer, ...(patch.viewer ?? {}) },
    };
    return validateSettings(merged);
  }, [settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, refreshSettings, updateSettings, validate }),
    [settings, refreshSettings, updateSettings, validate]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings deve ser usado dentro de SettingsProvider");
  }
  return ctx;
}
