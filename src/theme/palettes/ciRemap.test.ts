import { describe, expect, it } from "vitest";
import {
  applyCiRemapToTokenMap,
  CI_CSS,
  listCiRemapResiduals,
  remapHexToCiVar,
  remapRgbaToCiColorMix,
  remapValueToCi,
} from "./ciRemap";
import { PI_PALETTE_OVERRIDES } from "./piPalette";
import { PI_BUTTON_SYSTEM_TOKENS } from "./piButtonSystem";
import { AJUDA_PAGE_TOKENS, ciTint } from "../../pages/ajuda/ajudaPageTokens";

/** Residuos deliberados fora do SSOT CI. */
const DELIBERATE_RESIDUAL_VALUES = new Set([
  "#C8845A",
  "#6dbc88",
  "#1a3a22",
]);

describe("ciRemap + paleta CI pura (Incremento 4)", () => {
  it("utilitario ainda mapeia hex/rgba SSOT (para migracoes pontuais)", () => {
    expect(remapHexToCiVar("#1C4A7A")).toBe(CI_CSS.prussian600);
    expect(remapValueToCi("rgba(216,212,206,0.10)")).toBe(
      `color-mix(in srgb, ${CI_CSS.chalkDim} 10%, transparent)`
    );
    expect(remapRgbaToCiColorMix("rgba(240,237,232,0.6)")).toBe(
      `color-mix(in srgb, ${CI_CSS.chalk} 60%, transparent)`
    );
  });

  it("piPalette e CI puro nos acentos e superficies", () => {
    expect(PI_PALETTE_OVERRIDES.dark["blue-light"]).toBe(CI_CSS.prussian600);
    expect(PI_PALETTE_OVERRIDES.dark["bg-item-hover"]).toContain("--ci-chalk-dim");
    expect(PI_PALETTE_OVERRIDES.light["loading-overlay"]).toContain("--ci-chalk");
    expect(PI_PALETTE_OVERRIDES.light["door-drawer-bg"]).toContain("--ci-chalk");
  });

  it("botoes Pi usam CI vars directamente", () => {
    expect(PI_BUTTON_SYSTEM_TOKENS.dark["pi-btn-primary-bg"]).toBe(CI_CSS.prussian600);
    expect(PI_BUTTON_SYSTEM_TOKENS.light["pi-btn-secondary-border"]).toBe(CI_CSS.chalkDim);
  });

  it("residuos da paleta Pi sao so excepcoes deliberadas", () => {
    const residuals = listCiRemapResiduals(PI_PALETTE_OVERRIDES);
    for (const r of residuals) {
      const ok =
        DELIBERATE_RESIDUAL_VALUES.has(r.value) ||
        r.value.includes("rgba(0,0,0") ||
        /rgba\(\s*0\s*,\s*0\s*,\s*0/i.test(r.value);
      expect(
        ok,
        `residual inesperado: ${r.mode}.${r.token}=${r.value}`
      ).toBe(true);
    }
    const values = residuals.map((r) => r.value);
    expect(values).toContain("#C8845A");
    expect(values).toContain("#6dbc88");
    expect(values).toContain("#1a3a22");
  });

  it("applyCiRemapToTokenMap is idempotent on already-CI values", () => {
    const mapped = applyCiRemapToTokenMap({
      "blue-light": CI_CSS.prussian600,
      glass: `color-mix(in srgb, ${CI_CSS.chalkDim} 6%, transparent)`,
    });
    expect(mapped["blue-light"]).toBe(CI_CSS.prussian600);
    expect(mapped.glass).toContain("--ci-chalk-dim");
  });
});

describe("consumidores finais CI-native", () => {
  it("Help/WhatsNew tokens preferem --ci-* com fallback Alpha", () => {
    expect(AJUDA_PAGE_TOKENS.accent).toContain("--ci-prussian-600");
    expect(AJUDA_PAGE_TOKENS.accent).toContain("--blue-light");
    expect(AJUDA_PAGE_TOKENS.accentBg).toContain("color-mix");
    expect(ciTint("var(--ci-prussian-600)", 12)).toBe(
      "color-mix(in srgb, var(--ci-prussian-600) 12%, transparent)"
    );
  });
});
