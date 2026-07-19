import { describe, expect, it } from "vitest";
import {
  applyCiRemapToTokenMap,
  CI_CSS,
  remapHexToCiVar,
  remapRgbaToCiColorMix,
  remapValueToCi,
} from "./ciRemap";
import { PI_PALETTE_OVERRIDES } from "./piPalette";

describe("ciRemap (aplicação visual CI)", () => {
  it("mapeia Prussian/Sienna/core hex para var(--ci-*)", () => {
    expect(remapHexToCiVar("#1C4A7A")).toBe(CI_CSS.prussian600);
    expect(remapHexToCiVar("#8B4A1C")).toBe(CI_CSS.sienna600);
    expect(remapHexToCiVar("#F0EDE8")).toBe(CI_CSS.chalk);
    expect(remapHexToCiVar("#0A0B0C")).toBe(CI_CSS.darkCard);
  });

  it("converte rgba Prussian 600 para color-mix", () => {
    expect(remapRgbaToCiColorMix("rgba(28,74,122,0.25)")).toBe(
      `color-mix(in srgb, ${CI_CSS.prussian600} 25%, transparent)`
    );
    expect(remapValueToCi("rgba(28, 74, 122, 0.5)")).toBe(
      `color-mix(in srgb, ${CI_CSS.prussian600} 50%, transparent)`
    );
  });

  it("converte rgba Sienna 600 para color-mix", () => {
    expect(remapValueToCi("rgba(139,74,28,0.20)")).toBe(
      `color-mix(in srgb, ${CI_CSS.sienna600} 20%, transparent)`
    );
  });

  it("converte rgba Prussian 200 (focus-ring dark) para color-mix", () => {
    expect(remapValueToCi("rgba(144,184,224,0.5)")).toBe(
      `color-mix(in srgb, ${CI_CSS.prussian200} 50%, transparent)`
    );
  });

  it("preserva rgba/hex sem correspondência clara no SSOT", () => {
    expect(remapValueToCi("rgba(216,212,206,0.10)")).toBe("rgba(216,212,206,0.10)");
    expect(remapValueToCi("#C8845A")).toBe("#C8845A");
  });

  it("não altera var() / color-mix já existentes", () => {
    expect(remapValueToCi("var(--ci-prussian-600)")).toBe("var(--ci-prussian-600)");
    expect(remapValueToCi("color-mix(in srgb, red 50%, transparent)")).toBe(
      "color-mix(in srgb, red 50%, transparent)"
    );
  });

  it("piPalette dark aplica color-mix nos rgba Prussian/Sienna", () => {
    expect(PI_PALETTE_OVERRIDES.dark["bg-selected"]).toBe(
      `color-mix(in srgb, ${CI_CSS.prussian600} 25%, transparent)`
    );
    expect(PI_PALETTE_OVERRIDES.dark["status-progress-bg"]).toBe(
      `color-mix(in srgb, ${CI_CSS.sienna600} 20%, transparent)`
    );
    expect(PI_PALETTE_OVERRIDES.dark["status-progress-color"]).toBe("#C8845A");
  });

  it("aplica remap a um mapa de tokens", () => {
    const mapped = applyCiRemapToTokenMap({
      "blue-light": "#1C4A7A",
      "bg-selected": "rgba(28,74,122,0.25)",
    });
    expect(mapped["blue-light"]).toBe(CI_CSS.prussian600);
    expect(mapped["bg-selected"]).toBe(
      `color-mix(in srgb, ${CI_CSS.prussian600} 25%, transparent)`
    );
  });
});
