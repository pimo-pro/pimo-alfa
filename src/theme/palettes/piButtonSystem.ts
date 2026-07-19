import type { ButtonShape, TemplatePaletteOverrides } from "./types";

/**
 * Fase 4 — sistema de botões unificado (só quando o template Pi está ativo).
 *
 * Estas 6 variáveis não existem em src/index.css, por isso o Alpha nunca as lê —
 * qualquer consumidor referencia `var(--pi-btn-x, valor-atual-do-alpha)`, então sem
 * estas variáveis definidas (Alpha) o resultado é byte-a-byte igual ao de hoje.
 *
 * Decisão do utilizador: o botão "confirmar" do industrial mantém o verde semântico
 * (--pi-btn-confirm-bg), não vira Prussian — "confirmar" continua a significar verde.
 */
export const PI_BUTTON_SYSTEM_TOKENS: TemplatePaletteOverrides = {
  dark: {
    "pi-btn-primary-bg": "#1C4A7A",
    "pi-btn-on-accent-text": "#F0EDE8",
    "pi-btn-danger-bg": "#8B1C1C",
    "pi-btn-confirm-bg": "#2E5C3A",
    "pi-btn-ghost-bg": "#0A0B0C",
    "pi-btn-ghost-border": "#2C2E30",
  },
  light: {
    "pi-btn-primary-bg": "#1C4A7A",
    "pi-btn-on-accent-text": "#F0EDE8",
    "pi-btn-danger-bg": "#8B1C1C",
    "pi-btn-confirm-bg": "#2E5C3A",
    "pi-btn-ghost-bg": "#FFFFFF",
    "pi-btn-ghost-border": "#D8D4CE",
  },
};

/** Raio de borda por opção de formato — a única coisa que muda com o toggle de formato. */
export const BUTTON_SHAPE_RADIUS_PX: Record<ButtonShape, string> = {
  square: "0px",
  soft: "8px",
  pill: "999px",
};

export const BUTTON_SHAPE_LABELS: Record<ButtonShape, string> = {
  square: "Reto",
  soft: "Levemente arredondado",
  pill: "Muito arredondado",
};
