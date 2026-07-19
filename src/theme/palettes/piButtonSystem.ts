import type { ButtonShape, TemplatePaletteOverrides } from "./types";
import { applyCiRemapToPalette } from "./ciRemap";

/**
 * Fase 4 — sistema de botões unificado (só quando o template Pi está ativo).
 *
 * Cores: aplicadas no <html> pelo ThemeTemplateContext quando template=pi.
 * Radius: NÃO usa --pi-btn-radius no DOM — só data-pi-button-shape + CSS gated
 * (Passo 2), para não vazar para Alpha nem para estilos industriais.
 *
 * Hex SSOT remapeados para `var(--ci-*)` via ciRemap (aplicação visual CI).
 * Consumidores CSS sob [data-theme-template="pi"]; Alpha usa .button-primary / --ui-*.
 */
const PI_BUTTON_SYSTEM_HEX: TemplatePaletteOverrides = {
  dark: {
    "pi-btn-primary-bg": "#1C4A7A",
    "pi-btn-primary-color": "#F0EDE8",
    /** Alias legado (= primary-color) — mantido para refs existentes. */
    "pi-btn-on-accent-text": "#F0EDE8",
    "pi-btn-secondary-bg": "#0A0B0C",
    "pi-btn-secondary-color": "#F0EDE8",
    "pi-btn-secondary-border": "#2C2E30",
    "pi-btn-danger-bg": "#8B1C1C",
    "pi-btn-confirm-bg": "#2E5C3A",
    "pi-btn-ghost-bg": "#0A0B0C",
    "pi-btn-ghost-border": "#2C2E30",
  },
  light: {
    "pi-btn-primary-bg": "#1C4A7A",
    "pi-btn-primary-color": "#F0EDE8",
    "pi-btn-on-accent-text": "#F0EDE8",
    "pi-btn-secondary-bg": "#FFFFFF",
    "pi-btn-secondary-color": "#131518",
    "pi-btn-secondary-border": "#D8D4CE",
    "pi-btn-danger-bg": "#8B1C1C",
    "pi-btn-confirm-bg": "#2E5C3A",
    "pi-btn-ghost-bg": "#FFFFFF",
    "pi-btn-ghost-border": "#D8D4CE",
  },
};

export const PI_BUTTON_SYSTEM_TOKENS: TemplatePaletteOverrides =
  applyCiRemapToPalette(PI_BUTTON_SYSTEM_HEX);

/**
 * Raio por formato — usado em CSS gated (data-pi-button-shape) e no preview admin.
 * Não é injetado como --pi-btn-radius no <html>.
 */
export const BUTTON_SHAPE_RADIUS_PX: Record<ButtonShape, string> = {
  square: "0px",
  soft: "8px",
  pill: "999px",
};

/** Seletores utilitários alinhados a BUTTON_SHAPE_RADIUS_PX. */
export const BUTTON_SHAPE_ATTR = "data-pi-button-shape" as const;

export const BUTTON_SHAPE_LABELS: Record<ButtonShape, string> = {
  square: "Reto",
  soft: "Levemente arredondado",
  pill: "Muito arredondado",
};
