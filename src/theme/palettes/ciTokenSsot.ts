/**
 * SSOT do namespace `--ci-*` / escalas 7 tons
 * (derivado de `reference/chalk_iron_sienna_full_system.html` — ADR Opção C).
 *
 * Esta camada define o design system CI. As chaves da bridge usam o prefixo
 * `ci-` (sem `--`) e **não** redefinem tokens Alpha (`blue-light`, etc.),
 * para o remap `piPalette.ts` permanecer visualmente intacto até um passo
 * explícito de aplicação nos componentes.
 *
 * Merge runtime: piPalette ? CI_SSOT_TOKEN_BRIDGE ? userOverrides
 * (sem colisão com tokens Alpha, o remap vence nos nomes Alpha).
 *
 * Não expor no preload até um passo explícito.
 */

import type { TemplatePaletteOverrides, TokenValueMap } from "./types";
import { ALL_THEME_TOKENS } from "./tokenList";

/** Degraus oficiais das escalas (HTML de referência). */
export const CI_SCALE_STEPS = [50, 100, 200, 400, 600, 800, 900] as const;
export type CiScaleStep = (typeof CI_SCALE_STEPS)[number];

/**
 * Escala Prussian 50–900 (fundo do swatch no HTML oficial).
 * 600 = --ci-prussian; 200 ? --ci-prussian-lt; 800 ? --ci-prussian-dk.
 */
export const CI_PRUSSIAN_SCALE: Record<CiScaleStep, string> = {
  50: "#EBF1F8",
  100: "#C0D4EA",
  200: "#90B8E0",
  400: "#5A8CBF",
  600: "#1C4A7A",
  800: "#0F2D50",
  900: "#071A30",
};

/**
 * Escala Sienna 50–900 (fundo do swatch no HTML oficial).
 * 600 = --ci-sienna; 200 ? --ci-sienna-lt; 800 ? --ci-sienna-dk.
 */
export const CI_SIENNA_SCALE: Record<CiScaleStep, string> = {
  50: "#F5EDE6",
  100: "#E8CCBA",
  200: "#D4A882",
  400: "#B87040",
  600: "#8B4A1C",
  800: "#5C2E0C",
  900: "#321806",
};

/** Tokens base / semânticos / superfícies do bloco CSS do HTML oficial. */
export const CI_CORE_TOKENS = {
  chalk: "#F0EDE8",
  "chalk-dim": "#D8D4CE",
  iron: "#2C2E30",
  "iron-deep": "#131518",
  prussian: CI_PRUSSIAN_SCALE[600],
  "prussian-lt": CI_PRUSSIAN_SCALE[200],
  "prussian-dk": CI_PRUSSIAN_SCALE[800],
  sienna: CI_SIENNA_SCALE[600],
  "sienna-lt": CI_SIENNA_SCALE[200],
  "sienna-dk": CI_SIENNA_SCALE[800],
  success: "#2E5C3A",
  danger: "#8B1C1C",
  bg: "#F0EDE8",
  "bg-raised": "#F8F6F2",
  "bg-card": "#FFFFFF",
  border: "#D8D4CE",
  "dark-bg": "#131518",
  "dark-raised": "#0E0F11",
  "dark-card": "#0A0B0C",
  "dark-border": "#2C2E30",
} as const;

function buildCiNamespaceTokenMap(): TokenValueMap {
  const out: TokenValueMap = {};

  for (const [name, value] of Object.entries(CI_CORE_TOKENS)) {
    out[`ci-${name}`] = value;
  }
  for (const step of CI_SCALE_STEPS) {
    out[`ci-prussian-${step}`] = CI_PRUSSIAN_SCALE[step];
    out[`ci-sienna-${step}`] = CI_SIENNA_SCALE[step];
  }
  return out;
}

/** Mapa estático `ci-*` ? hex (igual em dark/light; escalas são do sistema, não do modo). */
export const CI_NAMESPACE_TOKENS: TokenValueMap = buildCiNamespaceTokenMap();

/** Nomes sem `--` — para limpar inline styles ao sair do template Pi. */
export const CI_TOKEN_NAMES: string[] = Object.keys(CI_NAMESPACE_TOKENS);

/**
 * Bridge no merge Pi: só namespace `ci-*` (sem tokens Alpha).
 * Dark/light partilham o mesmo catálogo — superfícies light/dark ficam como
 * `ci-bg*` / `ci-dark-*` para consumo futuro, sem remapear `--navy` etc.
 */
export const CI_SSOT_TOKEN_BRIDGE: TemplatePaletteOverrides = {
  dark: { ...CI_NAMESPACE_TOKENS },
  light: { ...CI_NAMESPACE_TOKENS },
};

/**
 * True se a bridge **não** redefine tokens Alpha do remap.
 * (Pode ter escalas `--ci-*` definidas — isso não conta como “remap aplicado”.)
 */
export function isCiSsotBridgeEmpty(): boolean {
  const keys = [
    ...Object.keys(CI_SSOT_TOKEN_BRIDGE.dark),
    ...Object.keys(CI_SSOT_TOKEN_BRIDGE.light),
  ];
  return keys.every((k) => !ALL_THEME_TOKENS.includes(k));
}

/** True se as escalas 7 tons estão presentes na bridge. */
export function hasCiScaleTokens(): boolean {
  return (
    CI_SSOT_TOKEN_BRIDGE.dark["ci-prussian-600"] === CI_PRUSSIAN_SCALE[600] &&
    CI_SSOT_TOKEN_BRIDGE.dark["ci-sienna-600"] === CI_SIENNA_SCALE[600]
  );
}
