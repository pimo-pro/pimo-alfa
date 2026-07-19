/**
 * Camada de remapeamento Pi ? `--ci-*` (consolidaùùo do design system CI).
 *
 * Hex SSOT exacto ? `var(--ci-*)`
 * rgba com RGB SSOT ? `color-mix(in srgb, var(--ci-ù) ?%, transparent)`:
 *   - Prussian 600 / 200, Sienna 600
 *   - Chalk-dim, Iron-deep, Success (superfùcies / status Pi)
 * Hex / rgba / sombras sem correspondùncia clara ? intactos
 *
 * Sù no runtime sob template Pi (piPalette / piButtonSystem).
 * Alpha e preload nùo usam este mùdulo.
 */

import type { TemplatePaletteOverrides, TokenValueMap } from "./types";

/** Referùncias CSS canùnicas (aliases do SSOT). */
export const CI_CSS = {
  chalk: "var(--ci-chalk)",
  chalkDim: "var(--ci-chalk-dim)",
  iron: "var(--ci-iron)",
  ironDeep: "var(--ci-iron-deep)",
  prussian: "var(--ci-prussian)",
  prussianLt: "var(--ci-prussian-lt)",
  prussianDk: "var(--ci-prussian-dk)",
  prussian50: "var(--ci-prussian-50)",
  prussian100: "var(--ci-prussian-100)",
  prussian200: "var(--ci-prussian-200)",
  prussian400: "var(--ci-prussian-400)",
  prussian600: "var(--ci-prussian-600)",
  prussian800: "var(--ci-prussian-800)",
  prussian900: "var(--ci-prussian-900)",
  sienna: "var(--ci-sienna)",
  siennaLt: "var(--ci-sienna-lt)",
  siennaDk: "var(--ci-sienna-dk)",
  sienna50: "var(--ci-sienna-50)",
  sienna100: "var(--ci-sienna-100)",
  sienna200: "var(--ci-sienna-200)",
  sienna400: "var(--ci-sienna-400)",
  sienna600: "var(--ci-sienna-600)",
  sienna800: "var(--ci-sienna-800)",
  sienna900: "var(--ci-sienna-900)",
  success: "var(--ci-success)",
  danger: "var(--ci-danger)",
  bg: "var(--ci-bg)",
  bgRaised: "var(--ci-bg-raised)",
  bgCard: "var(--ci-bg-card)",
  border: "var(--ci-border)",
  darkBg: "var(--ci-dark-bg)",
  darkRaised: "var(--ci-dark-raised)",
  darkCard: "var(--ci-dark-card)",
  darkBorder: "var(--ci-dark-border)",
} as const;

/** Hex SSOT (normalizado uppercase) ? var(--ci-*). */
const HEX_TO_CI_VAR: Record<string, string> = {
  "#F0EDE8": CI_CSS.chalk,
  "#D8D4CE": CI_CSS.chalkDim,
  "#2C2E30": CI_CSS.iron,
  "#131518": CI_CSS.ironDeep,
  "#1C4A7A": CI_CSS.prussian600,
  "#90B8E0": CI_CSS.prussian200,
  "#0F2D50": CI_CSS.prussian800,
  "#EBF1F8": CI_CSS.prussian50,
  "#C0D4EA": CI_CSS.prussian100,
  "#5A8CBF": CI_CSS.prussian400,
  "#071A30": CI_CSS.prussian900,
  "#8B4A1C": CI_CSS.sienna600,
  "#D4A882": CI_CSS.sienna200,
  "#5C2E0C": CI_CSS.sienna800,
  "#F5EDE6": CI_CSS.sienna50,
  "#E8CCBA": CI_CSS.sienna100,
  "#B87040": CI_CSS.sienna400,
  "#321806": CI_CSS.sienna900,
  "#2E5C3A": CI_CSS.success,
  "#8B1C1C": CI_CSS.danger,
  "#F8F6F2": CI_CSS.bgRaised,
  "#FFFFFF": CI_CSS.bgCard,
  "#0A0B0C": CI_CSS.darkCard,
  "#0E0F11": CI_CSS.darkRaised,
};

/** RGB canùnicos SSOT usados em rgba do remap Pi. */
const RGB_TO_CI_VAR: Array<{ r: number; g: number; b: number; ciVar: string }> = [
  { r: 28, g: 74, b: 122, ciVar: CI_CSS.prussian600 },
  { r: 144, g: 184, b: 224, ciVar: CI_CSS.prussian200 },
  { r: 139, g: 74, b: 28, ciVar: CI_CSS.sienna600 },
  { r: 216, g: 212, b: 206, ciVar: CI_CSS.chalkDim },
  { r: 19, g: 21, b: 24, ciVar: CI_CSS.ironDeep },
  { r: 46, g: 92, b: 58, ciVar: CI_CSS.success },
];

function normalizeHexKey(value: string): string | null {
  const v = value.trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return null;
  if (v.length === 4) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return v.toUpperCase();
}

function formatAlphaPercent(alpha: number): string {
  const pct = Math.round(alpha * 10000) / 100;
  if (Number.isInteger(pct)) return `${pct}%`;
  const trimmed = pct.toFixed(2).replace(/\.?0+$/, "");
  return `${trimmed}%`;
}

function colorMixCi(ciVar: string, alpha: number): string {
  return `color-mix(in srgb, ${ciVar} ${formatAlphaPercent(alpha)}, transparent)`;
}

/**
 * rgba(R,G,B,A) ? color-mix com token CI quando RGB = SSOT conhecido.
 * Aceita espaùos opcionais; alpha 0ù1.
 */
export function remapRgbaToCiColorMix(value: string): string | null {
  const m = value
    .trim()
    .match(
      /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|0?\.\d+|1(?:\.0+)?)\s*\)$/i
    );
  if (!m) return null;

  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  const a = Number(m[4]);
  if (a < 0 || a > 1) return null;

  for (const entry of RGB_TO_CI_VAR) {
    if (r === entry.r && g === entry.g && b === entry.b) {
      return colorMixCi(entry.ciVar, a);
    }
  }
  return null;
}

/** Remap completo de um valor de token (hex SSOT, rgba CI, ou intacto). */
export function remapValueToCi(value: string): string {
  if (!value) return value;
  if (value.startsWith("var(--ci-") || (value.startsWith("color-mix(") && value.includes("--ci-"))) {
    return value;
  }

  const rgbaMapped = remapRgbaToCiColorMix(value);
  if (rgbaMapped) return rgbaMapped;

  const key = normalizeHexKey(value);
  if (key) return HEX_TO_CI_VAR[key] ?? value;

  // Sombras / valores compostos com rgba(...) embutido (ex. inset Ö rgba(216,212,206,0.08))
  if (value.includes("rgba(")) {
    return value.replace(
      /rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(?:0|0?\.\d+|1(?:\.0+)?)\s*\)/gi,
      (match) => remapRgbaToCiColorMix(match) ?? match
    );
  }

  return value;
}

/** @deprecated Use remapValueToCi ó compatibilidade com testes do incremento 1. */
export function remapHexToCiVar(value: string): string {
  return remapValueToCi(value);
}

export function applyCiRemapToTokenMap(map: TokenValueMap): TokenValueMap {
  const out: TokenValueMap = {};
  for (const [token, value] of Object.entries(map)) {
    if (value != null) out[token] = remapValueToCi(value);
  }
  return out;
}

export function applyCiRemapToPalette(palette: TemplatePaletteOverrides): TemplatePaletteOverrides {
  return {
    dark: applyCiRemapToTokenMap(palette.dark),
    light: applyCiRemapToTokenMap(palette.light),
  };
}

/**
 * Tokens cujo valor pùs-remap ainda nùo ù `var(--ci-*)` nem `color-mix(...ci...)`.
 * ùtil para consolidaùùo: resùduos esperados (ex. #C8845A, sombras pretas).
 */
export function listCiRemapResiduals(palette: TemplatePaletteOverrides): Array<{
  mode: "dark" | "light";
  token: string;
  value: string;
}> {
  const out: Array<{ mode: "dark" | "light"; token: string; value: string }> = [];
  for (const mode of ["dark", "light"] as const) {
    const mapped = applyCiRemapToTokenMap(palette[mode]);
    for (const [token, value] of Object.entries(mapped)) {
      if (!value) continue;
      const usesCi =
        value.includes("--ci-") ||
        value.startsWith("var(--ci-") ||
        (value.startsWith("color-mix(") && value.includes("--ci-"));
      if (!usesCi) out.push({ mode, token, value });
    }
  }
  return out;
}
