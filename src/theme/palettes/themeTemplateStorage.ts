/**
 * Armazenamento do template de tema ativo (LocalStorage).
 */

import type { ButtonShape, ThemeTemplateId, TokenValueMap } from "./types";
import { DEFAULT_BUTTON_SHAPE } from "./types";
import { DEFAULT_THEME_TEMPLATE, THEME_TEMPLATES } from "./templateRegistry";

const TEMPLATE_STORAGE_KEY = "pimo-theme-template";
const BUTTON_SHAPE_STORAGE_KEY = "pimo-pi-button-shape";
/** Fase 6: overrides individuais de token por cima da paleta do template ativo. */
const TOKEN_OVERRIDES_STORAGE_KEY = "pimo-pi-token-overrides";

export function readStoredThemeTemplate(): ThemeTemplateId {
  try {
    const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (THEME_TEMPLATES.some((t) => t.id === stored)) return stored as ThemeTemplateId;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME_TEMPLATE;
}

export function storeThemeTemplate(id: ThemeTemplateId): void {
  try {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function readStoredButtonShape(): ButtonShape {
  try {
    const stored = localStorage.getItem(BUTTON_SHAPE_STORAGE_KEY);
    if (stored === "square" || stored === "soft" || stored === "pill") return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_BUTTON_SHAPE;
}

export function storeButtonShape(shape: ButtonShape): void {
  try {
    localStorage.setItem(BUTTON_SHAPE_STORAGE_KEY, shape);
  } catch {
    /* ignore */
  }
}

/**
 * Overrides individuais de token (Fase 6 — arquitetura pronta, sem editor de UI ainda).
 * Guardados por modo (dark/light), aplicados por cima da paleta do template ativo.
 */
export interface StoredTokenOverrides {
  dark: TokenValueMap;
  light: TokenValueMap;
}

const EMPTY_OVERRIDES: StoredTokenOverrides = { dark: {}, light: {} };

export function readStoredTokenOverrides(): StoredTokenOverrides {
  try {
    const stored = localStorage.getItem(TOKEN_OVERRIDES_STORAGE_KEY);
    if (!stored) return EMPTY_OVERRIDES;
    const parsed = JSON.parse(stored) as Partial<StoredTokenOverrides>;
    return { dark: parsed.dark ?? {}, light: parsed.light ?? {} };
  } catch {
    return EMPTY_OVERRIDES;
  }
}

export function storeTokenOverrides(overrides: StoredTokenOverrides): void {
  try {
    localStorage.setItem(TOKEN_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    /* ignore */
  }
}

/** Define (ou remove, com value=null) o override de um único token num único modo. */
export function setTokenOverride(mode: "dark" | "light", token: string, value: string | null): StoredTokenOverrides {
  const current = readStoredTokenOverrides();
  const next: StoredTokenOverrides = {
    dark: { ...current.dark },
    light: { ...current.light },
  };
  if (value === null) {
    delete next[mode][token];
  } else {
    next[mode][token] = value;
  }
  storeTokenOverrides(next);
  return next;
}
