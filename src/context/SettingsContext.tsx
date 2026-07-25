/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useAuth } from "../auth/useAuth";
import {
  fetchGlobalSettings,
  fetchUserSettings,
  flushUserSettingsRemoteQueue,
  resolveUserSettingsPipeline,
  scheduleUserSettingsRemotePatch,
} from "../core/userSettings/userSettingsService";
import { devLogger } from "../utils/devLogger";
import {
  getSettings,
  saveSettings,
  validateSettings,
  type SettingsSchema,
} from "../core/settings/settingsService";
import { mergeOrcamentosSettings } from "../core/orcamentos";
import {
  loadCentralPricing,
  orcamentosDefaultsFromCentral,
  financeiroAdminDefaultsFromCentral,
  ivaPctFromCentral,
} from "../core/pricing/centralPricingConfig";
import {
  saveGlobalFinanceiroAdminSettings,
  FINANCEIRO_ADMIN_SETTINGS_STORAGE_KEY,
} from "../core/financeiro/financeiroAdminRules";
import { normalizeFinanceiroAdminSettings } from "../core/financeiro/financeiroAdminRules";

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

/**
 * Arranque: GET /config/global (público) → depois, se autenticado, GET /user/settings.
 * Merge: defaults → global → user online → local (`pimo_system_settings_v1`) → validateSettings.
 * Visitante: mesmo pipeline sem camada user; falha de rede no global cai no fallback (comportamento anterior).
 * Extensão futura: UI admin para editar `global-settings.json` no servidor (ver globalSettingsService).
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  const [settings, setSettings] = useState<SettingsSchema>(() => getSettings());

  useEffect(() => {
    if (loading) return;

    let cancelled = false;
    void (async () => {
      // SSOT /config/pricing.json — mesmos defaults local e produção
      try {
        await loadCentralPricing();
        if (typeof localStorage !== "undefined" && !localStorage.getItem(FINANCEIRO_ADMIN_SETTINGS_STORAGE_KEY)) {
          saveGlobalFinanceiroAdminSettings(financeiroAdminDefaultsFromCentral());
        }
      } catch {
        /* builtin fallback já em cache */
      }
      if (cancelled) return;

      const globalPartial = await fetchGlobalSettings();
      if (cancelled) return;

      if (!token) {
        try {
          const resolved = resolveUserSettingsPipeline(null, globalPartial);
          const withPricing = {
            ...resolved,
            orcamentos: mergeOrcamentosSettings(
              orcamentosDefaultsFromCentral(),
              resolved.orcamentos ?? {}
            ),
            financeiroAdmin: normalizeFinanceiroAdminSettings(
              resolved.financeiroAdmin ?? financeiroAdminDefaultsFromCentral()
            ),
            ivaPctDefault:
              typeof resolved.ivaPctDefault === "number"
                ? resolved.ivaPctDefault
                : ivaPctFromCentral(),
          };
          const result = saveSettings(withPricing);
          if (!cancelled) setSettings(result.settings);
          if (import.meta.env.DEV) {
            devLogger.info(
              "[PIMO][settings] visitante: pipeline com global + pricing.json",
              globalPartial ? "GET /config/global ok" : "fallback (sem global)"
            );
          }
        } catch {
          if (!cancelled) setSettings(getSettings());
        }
        return;
      }

      let online: Record<string, unknown> | null = null;
      try {
        online = await fetchUserSettings();
      } catch {
        if (import.meta.env.DEV) {
          devLogger.warn("[PIMO][settings] GET /user/settings falhou; merge com global + local");
        }
      }
      if (cancelled) return;

      try {
        const resolved = resolveUserSettingsPipeline(online, globalPartial);
        const withPricing = {
          ...resolved,
          orcamentos: mergeOrcamentosSettings(
            orcamentosDefaultsFromCentral(),
            resolved.orcamentos ?? {}
          ),
          financeiroAdmin: normalizeFinanceiroAdminSettings(
            resolved.financeiroAdmin ?? financeiroAdminDefaultsFromCentral()
          ),
          ivaPctDefault:
            typeof resolved.ivaPctDefault === "number"
              ? resolved.ivaPctDefault
              : ivaPctFromCentral(),
        };
        const result = saveSettings(withPricing);
        if (!cancelled) setSettings(result.settings);
        if (import.meta.env.DEV) {
          devLogger.info(
            "[PIMO][settings] autenticado: pipeline com global + user + pricing.json",
            globalPartial ? "global ok" : "global fallback"
          );
        }
      } catch {
        if (!cancelled) setSettings(getSettings());
      } finally {
        if (!cancelled) void flushUserSettingsRemoteQueue();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, token]);

  useEffect(() => {
    if (!token) return;
    const intervalId = window.setInterval(() => void flushUserSettingsRemoteQueue(), 45000);
    const onOnline = () => void flushUserSettingsRemoteQueue();
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("online", onOnline);
    };
  }, [token]);

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
      orcamentos: mergeOrcamentosSettings(settings.orcamentos, patch.orcamentos ?? {}),
      financeiroAdmin: normalizeFinanceiroAdminSettings({
        ...settings.financeiroAdmin,
        ...(patch.financeiroAdmin ?? {}),
        adm: { ...settings.financeiroAdmin?.adm, ...(patch.financeiroAdmin?.adm ?? {}) },
        montagem: {
          ...settings.financeiroAdmin?.montagem,
          ...(patch.financeiroAdmin?.montagem ?? {}),
        },
        portes: { ...settings.financeiroAdmin?.portes, ...(patch.financeiroAdmin?.portes ?? {}) },
      }),
      ivaPctDefault:
        typeof patch.ivaPctDefault === "number" ? patch.ivaPctDefault : settings.ivaPctDefault,
      materiais: { ...settings.materiais, ...(patch.materiais ?? {}) },
      cnc: { ...settings.cnc, ...(patch.cnc ?? {}) },
      nesting: { ...settings.nesting, ...(patch.nesting ?? {}) },
      portas: { ...settings.portas, ...(patch.portas ?? {}) },
      gavetas: { ...settings.gavetas, ...(patch.gavetas ?? {}) },
      modeloPI: { ...settings.modeloPI, ...(patch.modeloPI ?? {}) },
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
    if (result.success && result.settings.financeiroAdmin) {
      saveGlobalFinanceiroAdminSettings(result.settings.financeiroAdmin);
    }
    if (token) {
      scheduleUserSettingsRemotePatch(patch);
      void flushUserSettingsRemoteQueue();
    }
    return result;
  }, [settings, token]);

  const validate = useCallback((patch: DeepPartial<SettingsSchema>) => {
    const merged = {
      ...settings,
      ...patch,
      geral: { ...settings.geral, ...(patch.geral ?? {}) },
      fabrica: { ...settings.fabrica, ...(patch.fabrica ?? {}) },
      precos: { ...settings.precos, ...(patch.precos ?? {}) },
      orcamentos: mergeOrcamentosSettings(settings.orcamentos, patch.orcamentos ?? {}),
      materiais: { ...settings.materiais, ...(patch.materiais ?? {}) },
      cnc: { ...settings.cnc, ...(patch.cnc ?? {}) },
      nesting: { ...settings.nesting, ...(patch.nesting ?? {}) },
      portas: { ...settings.portas, ...(patch.portas ?? {}) },
      gavetas: { ...settings.gavetas, ...(patch.gavetas ?? {}) },
      modeloPI: { ...settings.modeloPI, ...(patch.modeloPI ?? {}) },
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
