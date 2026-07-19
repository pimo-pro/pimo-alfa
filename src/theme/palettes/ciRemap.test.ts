import { describe, expect, it } from "vitest";
import {
  applyCiRemapToTokenMap,
  CI_CSS,
  listCiRemapResiduals,
  remapHexToCiVar,
  remapRgbaToCiColorMix,
  remapValueToCi,
} from "./ciRemap";
import { PI_PALETTE_HEX_OVERRIDES, PI_PALETTE_OVERRIDES } from "./piPalette";

describe("ciRemap (consolidação CI)", () => {
  it("mapeia Prussian/Sienna/core hex para var(--ci-*)", () => {
    expect(remapHexToCiVar("#1C4A7A")).toBe(CI_CSS.prussian600);
    expect(remapHexToCiVar("#8B4A1C")).toBe(CI_CSS.sienna600);
    expect(remapHexToCiVar("#F0EDE8")).toBe(CI_CSS.chalk);
    expect(remapHexToCiVar("#0A0B0C")).toBe(CI_CSS.darkCard);
  });

  it("converte rgba Prussian / Sienna / chalk-dim / iron-deep / success", () => {
    expect(remapRgbaToCiColorMix("rgba(28,74,122,0.25)")).toBe(
      `color-mix(in srgb, ${CI_CSS.prussian600} 25%, transparent)`
    );
    expect(remapValueToCi("rgba(139,74,28,0.20)")).toBe(
      `color-mix(in srgb, ${CI_CSS.sienna600} 20%, transparent)`
    );
    expect(remapValueToCi("rgba(216,212,206,0.10)")).toBe(
      `color-mix(in srgb, ${CI_CSS.chalkDim} 10%, transparent)`
    );
    expect(remapValueToCi("rgba(19,21,24,0.55)")).toBe(
      `color-mix(in srgb, ${CI_CSS.ironDeep} 55%, transparent)`
    );
    expect(remapValueToCi("rgba(46,92,58,0.20)")).toBe(
      `color-mix(in srgb, ${CI_CSS.success} 20%, transparent)`
    );
  });

  it("remapeia rgba embutido em sombras / valores compostos", () => {
    expect(remapValueToCi("inset 0 -1px 0 rgba(216,212,206,0.08)")).toBe(
      `inset 0 -1px 0 color-mix(in srgb, ${CI_CSS.chalkDim} 8%, transparent)`
    );
    expect(remapValueToCi("0 24px 60px rgba(0,0,0,0.45)")).toBe("0 24px 60px rgba(0,0,0,0.45)");
  });

  it("preserva hex/rgba sem correspondência clara no SSOT", () => {
    expect(remapValueToCi("#C8845A")).toBe("#C8845A");
    expect(remapValueToCi("#6dbc88")).toBe("#6dbc88");
    expect(remapValueToCi("rgba(0,0,0,0.3)")).toBe("rgba(0,0,0,0.3)");
  });

  it("piPalette aplica CI em superfícies e status", () => {
    expect(PI_PALETTE_OVERRIDES.dark["bg-item-hover"]).toBe(
      `color-mix(in srgb, ${CI_CSS.chalkDim} 10%, transparent)`
    );
    expect(PI_PALETTE_OVERRIDES.dark["overlay-backdrop"]).toBe(
      `color-mix(in srgb, ${CI_CSS.ironDeep} 55%, transparent)`
    );
    expect(PI_PALETTE_OVERRIDES.dark["status-done-bg"]).toBe(
      `color-mix(in srgb, ${CI_CSS.success} 20%, transparent)`
    );
    expect(PI_PALETTE_OVERRIDES.light["bg-item-hover"]).toBe(
      `color-mix(in srgb, ${CI_CSS.ironDeep} 10%, transparent)`
    );
  });

  it("resíduos pós-remap são só casos deliberados", () => {
    const residuals = listCiRemapResiduals(PI_PALETTE_HEX_OVERRIDES);
    const values = residuals.map((r) => r.value);

    expect(values.some((v) => /rgba\(\s*28\s*,\s*74\s*,\s*122/i.test(v))).toBe(false);
    expect(values.some((v) => /rgba\(\s*139\s*,\s*74\s*,\s*28/i.test(v))).toBe(false);
    expect(values.some((v) => /rgba\(\s*216\s*,\s*212\s*,\s*206/i.test(v))).toBe(false);
    expect(values.some((v) => /rgba\(\s*19\s*,\s*21\s*,\s*24/i.test(v))).toBe(false);
    expect(values.some((v) => /rgba\(\s*46\s*,\s*92\s*,\s*58/i.test(v))).toBe(false);

    expect(values).toContain("#C8845A");
    expect(values).toContain("#6dbc88");
    expect(values.some((v) => v.includes("rgba(0,0,0"))).toBe(true);
  });

  it("aplica remap a um mapa de tokens", () => {
    const mapped = applyCiRemapToTokenMap({
      "blue-light": "#1C4A7A",
      "bg-selected": "rgba(28,74,122,0.25)",
      glass: "rgba(216,212,206,0.06)",
    });
    expect(mapped["blue-light"]).toBe(CI_CSS.prussian600);
    expect(mapped["bg-selected"]).toBe(
      `color-mix(in srgb, ${CI_CSS.prussian600} 25%, transparent)`
    );
    expect(mapped.glass).toBe(`color-mix(in srgb, ${CI_CSS.chalkDim} 6%, transparent)`);
  });
});
