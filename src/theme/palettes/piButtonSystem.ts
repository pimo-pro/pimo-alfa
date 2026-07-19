import type { ButtonShape, TemplatePaletteOverrides } from "./types";
import { CI_CSS } from "./ciRemap";

/**
 * Sistema de botões unificado (só quando o template Pi está ativo).
 *
 * Cores CI puras (`var(--ci-*)`), aplicadas no <html> pelo ThemeTemplateContext
 * quando template=pi. Sem tabela hex intermediária.
 *
 * CTA principal (accent): Sienna 600 `#8B4A1C` — classes .button-primary / ui-primary /
 * modal-action.primary / moveis add / v4 add.
 * `--pi-btn-primary-*` permanece Prussian (outline, link, selection-adjacent).
 *
 * Nota: a escala CI não tem degrau 700 (50/100/200/400/600/800/900). O hover usa
 * `var(--ci-sienna-700, color-mix(600, 800))` sem criar token CI novo.
 *
 * Radius: NÃO usa --pi-btn-radius no DOM — só data-pi-button-shape + CSS gated.
 * Alpha usa .button-primary / --ui-* (não lê estes tokens).
 */

/** Hover Sienna ≈ 700: fallback até existir `--ci-sienna-700` no SSOT. */
const PI_BTN_ACCENT_HOVER_BG =
  "var(--ci-sienna-700, color-mix(in srgb, var(--ci-sienna-600) 40%, var(--ci-sienna-800) 60%))";

const PI_BTN_ACCENT_TOKENS = {
  "pi-btn-accent-bg": CI_CSS.sienna600,
  "pi-btn-accent-hover-bg": PI_BTN_ACCENT_HOVER_BG,
  "pi-btn-accent-active-bg": CI_CSS.sienna800,
  "pi-btn-accent-color": CI_CSS.chalk,
} as const;

export const PI_BUTTON_SYSTEM_TOKENS: TemplatePaletteOverrides = {
  dark: {
    "pi-btn-primary-bg": CI_CSS.prussian600,
    "pi-btn-primary-color": CI_CSS.chalk,
    /** Alias legado (= primary-color) — mantido para refs existentes. */
    "pi-btn-on-accent-text": CI_CSS.chalk,
    "pi-btn-secondary-bg": CI_CSS.darkCard,
    "pi-btn-secondary-color": CI_CSS.chalk,
    "pi-btn-secondary-border": CI_CSS.iron,
    "pi-btn-danger-bg": CI_CSS.danger,
    "pi-btn-confirm-bg": CI_CSS.success,
    "pi-btn-ghost-bg": CI_CSS.darkCard,
    "pi-btn-ghost-border": CI_CSS.iron,
    ...PI_BTN_ACCENT_TOKENS,
  },
  light: {
    "pi-btn-primary-bg": CI_CSS.prussian600,
    "pi-btn-primary-color": CI_CSS.chalk,
    "pi-btn-on-accent-text": CI_CSS.chalk,
    "pi-btn-secondary-bg": CI_CSS.bgCard,
    "pi-btn-secondary-color": CI_CSS.ironDeep,
    "pi-btn-secondary-border": CI_CSS.chalkDim,
    "pi-btn-danger-bg": CI_CSS.danger,
    "pi-btn-confirm-bg": CI_CSS.success,
    "pi-btn-ghost-bg": CI_CSS.bgCard,
    "pi-btn-ghost-border": CI_CSS.chalkDim,
    ...PI_BTN_ACCENT_TOKENS,
  },
};

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
