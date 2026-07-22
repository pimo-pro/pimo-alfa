import { describe, expect, it, beforeEach } from "vitest";
import {
  clearAllPiTokenOverrides,
  getPiPaletteLayers,
  listOverriddenPiTokens,
  resolvePiPaletteForMode,
  resolvePiTokenSource,
  setPiTokenOverride,
} from "./piTokenOverridesApi";
import { PI_PALETTE_OVERRIDES } from "./piPalette";
import {
  CI_PRUSSIAN_SCALE,
  CI_SIENNA_SCALE,
  hasCiScaleTokens,
  isCiSsotBridgeEmpty,
} from "./ciTokenSsot";
import { CI_CSS } from "./ciRemap";
import { PI_BUTTON_SYSTEM_TOKENS } from "./piButtonSystem";

describe("piTokenOverridesApi (Fase 6 + CI SSOT)", () => {
  beforeEach(() => {
    clearAllPiTokenOverrides();
  });

  it("SSOT bridge não redefine tokens Alpha (só namespace ci-*)", () => {
    expect(isCiSsotBridgeEmpty()).toBe(true);
    expect(hasCiScaleTokens()).toBe(true);
  });

  it("merge sem overrides: remap Pi usa CI vars; escalas CI disponíveis", () => {
    const resolved = resolvePiPaletteForMode("dark");
    expect(resolved["blue-light"]).toBe(CI_CSS.prussian600);
    expect(resolved["text-main"]).toBe(CI_CSS.chalk);
    expect(resolved["ci-prussian-600"]).toBe(CI_PRUSSIAN_SCALE[600]);
    expect(resolved["ci-sienna-600"]).toBe(CI_SIENNA_SCALE[600]);
    expect(resolved["ci-prussian"]).toBe(CI_PRUSSIAN_SCALE[600]);
    expect(resolved["blue-light"]).toBe(PI_PALETTE_OVERRIDES.dark["blue-light"]);
  });

  it("botões Pi usam CI vars no primary", () => {
    expect(PI_BUTTON_SYSTEM_TOKENS.dark["pi-btn-primary-bg"]).toBe(CI_CSS.prussian600);
    expect(PI_BUTTON_SYSTEM_TOKENS.light["pi-btn-danger-bg"]).toBe(CI_CSS.danger);
  });

  it("user overrides ganham sobre piPalette", () => {
    setPiTokenOverride("dark", "blue-light", "#ff00ff");
    const resolved = resolvePiPaletteForMode("dark");
    expect(resolved["blue-light"]).toBe("#ff00ff");
    expect(resolvePiTokenSource("dark", "blue-light").layer).toBe("userOverrides");
  });

  it("fonte de escala CI — ciSsotBridge (não override de utilizador)", () => {
    expect(resolvePiTokenSource("light", "ci-prussian-50").layer).toBe("ciSsotBridge");
    expect(resolvePiTokenSource("light", "ci-sienna-900").value).toBe(CI_SIENNA_SCALE[900]);
  });

  it("rejeita token não editável", () => {
    setPiTokenOverride("dark", "not-a-real-token", "#000");
    expect(listOverriddenPiTokens("dark")).not.toContain("not-a-real-token");
  });

  it("camadas expõem piPalette, CI e userOverrides", () => {
    const layers = getPiPaletteLayers("light");
    expect(Object.keys(layers.piPalette).length).toBeGreaterThan(10);
    expect(Object.keys(layers.ciSsotBridge).length).toBeGreaterThan(10);
    expect(layers.ciSsotBridge["ci-prussian-50"]).toBe(CI_PRUSSIAN_SCALE[50]);
    expect(Object.keys(layers.userOverrides).length).toBe(0);
  });
});
