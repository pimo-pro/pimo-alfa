/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  getSettings,
  saveSettings,
  validateSettings,
  type SettingsSchema,
} from "../core/settings/settingsService";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

type SettingsContextValue = {
  settings: SettingsSchema;
  refreshSettings: () => void;
  updateSettings: (_patch: DeepPartial<SettingsSchema>) => {
    success: boolean;
    message: string;
    settings: SettingsSchema;
    errors: string[];
  };
  validate: (_patch: DeepPartial<SettingsSchema>) => {
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

  const updateSettings = useCallback((patch: DeepPartial<SettingsSchema>) => {
    const merged = {
      ...settings,
      ...patch,
      geral: { ...settings.geral, ...(patch.geral ?? {}) },
      fabrica: { ...settings.fabrica, ...(patch.fabrica ?? {}) },
      precos: { ...settings.precos, ...(patch.precos ?? {}) },
      materiais: { ...settings.materiais, ...(patch.materiais ?? {}) },
      cnc: { ...settings.cnc, ...(patch.cnc ?? {}) },
      nesting: { ...settings.nesting, ...(patch.nesting ?? {}) },
      portas: { ...settings.portas, ...(patch.portas ?? {}) },
      gavetas: { ...settings.gavetas, ...(patch.gavetas ?? {}) },
      ferragens: {
        ...settings.ferragens,
        ...(patch.ferragens ?? {}),
        cavilha: { ...settings.ferragens.cavilha, ...(patch.ferragens?.cavilha ?? {}) },
        parafuso: { ...settings.ferragens.parafuso, ...(patch.ferragens?.parafuso ?? {}) },
        corredica: { ...settings.ferragens.corredica, ...(patch.ferragens?.corredica ?? {}) },
      },
      viewer: { ...settings.viewer, ...(patch.viewer ?? {}) },
      furação: {
        ...settings.furação,
        ...(patch.furação ?? {}),
        parafuso: { ...settings.furação.parafuso, ...(patch.furação?.parafuso ?? {}) },
        cavilha: { ...settings.furação.cavilha, ...(patch.furação?.cavilha ?? {}) },
      },
    };
    const result = saveSettings(merged as SettingsSchema);
    setSettings(result.settings);
    return result;
  }, [settings]);

  const validate = useCallback((patch: DeepPartial<SettingsSchema>) => {
    const merged = {
      ...settings,
      ...patch,
      geral: { ...settings.geral, ...(patch.geral ?? {}) },
      fabrica: { ...settings.fabrica, ...(patch.fabrica ?? {}) },
      precos: { ...settings.precos, ...(patch.precos ?? {}) },
      materiais: { ...settings.materiais, ...(patch.materiais ?? {}) },
      cnc: { ...settings.cnc, ...(patch.cnc ?? {}) },
      nesting: { ...settings.nesting, ...(patch.nesting ?? {}) },
      portas: { ...settings.portas, ...(patch.portas ?? {}) },
      gavetas: { ...settings.gavetas, ...(patch.gavetas ?? {}) },
      ferragens: {
        ...settings.ferragens,
        ...(patch.ferragens ?? {}),
        cavilha: { ...settings.ferragens.cavilha, ...(patch.ferragens?.cavilha ?? {}) },
        parafuso: { ...settings.ferragens.parafuso, ...(patch.ferragens?.parafuso ?? {}) },
        corredica: { ...settings.ferragens.corredica, ...(patch.ferragens?.corredica ?? {}) },
      },
      viewer: { ...settings.viewer, ...(patch.viewer ?? {}) },
      furação: {
        ...settings.furação,
        ...(patch.furação ?? {}),
        parafuso: { ...settings.furação.parafuso, ...(patch.furação?.parafuso ?? {}) },
        cavilha: { ...settings.furação.cavilha, ...(patch.furação?.cavilha ?? {}) },
      },
    };
    return validateSettings(merged as SettingsSchema);
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
