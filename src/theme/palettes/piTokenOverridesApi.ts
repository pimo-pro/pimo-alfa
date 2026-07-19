/**
 * API Fase 6 — overrides de tokens Pi.
 *
 * Camadas de merge (prioridade crescente):
 * 1. `PI_PALETTE_OVERRIDES` — runtime atual (remap Alpha ? Pi)
 * 2. `CI_SSOT_TOKEN_BRIDGE` — namespace `--ci-*` / escalas (não redefine tokens Alpha)
 * 3. `pimo-pi-token-overrides` — overrides de utilizador / editor
 *
 * Alpha nunca passa por este merge (ThemeTemplateContext sai cedo).
 * Botões (`PI_BUTTON_SYSTEM_TOKENS`) continuam aplicados à parte no Context.
 */

import { PI_PALETTE_OVERRIDES } from "./piPalette";
import { CI_SSOT_TOKEN_BRIDGE } from "./ciTokenSsot";
import { ALL_THEME_TOKENS } from "./tokenList";
import type { TokenValueMap } from "./types";
import {
  readStoredTokenOverrides,
  setTokenOverride as persistTokenOverride,
  storeTokenOverrides,
  type StoredTokenOverrides,
} from "./themeTemplateStorage";

export type ThemeMode = "dark" | "light";

export type PiPaletteLayerId = "piPalette" | "ciSsotBridge" | "userOverrides";

export interface PiPaletteMergeLayers {
  piPalette: TokenValueMap;
  ciSsotBridge: TokenValueMap;
  userOverrides: TokenValueMap;
}

const OVERRIDE_LISTENERS = new Set<() => void>();

/** Subscreve mudanças de overrides (Context / editor reaplica tokens). */
export function subscribePiTokenOverrides(listener: () => void): () => void {
  OVERRIDE_LISTENERS.add(listener);
  return () => {
    OVERRIDE_LISTENERS.delete(listener);
  };
}

function notifyPiTokenOverridesChanged(): void {
  for (const listener of OVERRIDE_LISTENERS) {
    try {
      listener();
    } catch {
      /* ignore listener errors */
    }
  }
}

export function isEditablePiToken(token: string): boolean {
  return ALL_THEME_TOKENS.includes(token);
}

/** Devolve as três camadas cruas (sem merge) para um modo. */
export function getPiPaletteLayers(mode: ThemeMode): PiPaletteMergeLayers {
  return {
    piPalette: { ...(PI_PALETTE_OVERRIDES[mode] ?? {}) },
    ciSsotBridge: { ...(CI_SSOT_TOKEN_BRIDGE[mode] ?? {}) },
    userOverrides: { ...(readStoredTokenOverrides()[mode] ?? {}) },
  };
}

/**
 * Merge das camadas Pi para um modo.
 * Ordem: piPalette ? ciSsotBridge ? userOverrides.
 * CI só adiciona chaves `ci-*` — o remap Alpha permanece intacto.
 */
export function resolvePiPaletteForMode(mode: ThemeMode): TokenValueMap {
  const layers = getPiPaletteLayers(mode);
  return {
    ...layers.piPalette,
    ...layers.ciSsotBridge,
    ...layers.userOverrides,
  };
}

/** Explica de que camada veio o valor efetivo de um token (debug / editor). */
export function resolvePiTokenSource(
  mode: ThemeMode,
  token: string
): { value: string | undefined; layer: PiPaletteLayerId | "none" } {
  const layers = getPiPaletteLayers(mode);
  if (layers.userOverrides[token]) {
    return { value: layers.userOverrides[token], layer: "userOverrides" };
  }
  if (layers.ciSsotBridge[token]) {
    return { value: layers.ciSsotBridge[token], layer: "ciSsotBridge" };
  }
  if (layers.piPalette[token]) {
    return { value: layers.piPalette[token], layer: "piPalette" };
  }
  return { value: undefined, layer: "none" };
}

export function readPiTokenOverrides(): StoredTokenOverrides {
  return readStoredTokenOverrides();
}

export function writePiTokenOverrides(overrides: StoredTokenOverrides): StoredTokenOverrides {
  storeTokenOverrides(overrides);
  notifyPiTokenOverridesChanged();
  return overrides;
}

/**
 * Define ou remove (value=null) um override.
 * Tokens fora de ALL_THEME_TOKENS são rejeitados (não grava).
 */
export function setPiTokenOverride(
  mode: ThemeMode,
  token: string,
  value: string | null
): StoredTokenOverrides {
  if (value !== null && !isEditablePiToken(token)) {
    return readStoredTokenOverrides();
  }
  const next = persistTokenOverride(mode, token, value);
  notifyPiTokenOverridesChanged();
  return next;
}

export function clearPiTokenOverride(mode: ThemeMode, token: string): StoredTokenOverrides {
  return setPiTokenOverride(mode, token, null);
}

export function clearPiTokenOverridesForMode(mode: ThemeMode): StoredTokenOverrides {
  const current = readStoredTokenOverrides();
  const next: StoredTokenOverrides = {
    dark: mode === "dark" ? {} : { ...current.dark },
    light: mode === "light" ? {} : { ...current.light },
  };
  return writePiTokenOverrides(next);
}

export function clearAllPiTokenOverrides(): StoredTokenOverrides {
  return writePiTokenOverrides({ dark: {}, light: {} });
}

export function listOverriddenPiTokens(mode: ThemeMode): string[] {
  return Object.keys(readStoredTokenOverrides()[mode] ?? {}).sort();
}

export function hasPiTokenOverrides(): boolean {
  const o = readStoredTokenOverrides();
  return Object.keys(o.dark).length > 0 || Object.keys(o.light).length > 0;
}
