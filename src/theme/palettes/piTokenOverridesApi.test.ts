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
import { isCiSsotBridgeEmpty } from "./ciTokenSsot";

describe("piTokenOverridesApi (Fase 6 — sem UI)", () => {
  beforeEach(() => {
    clearAllPiTokenOverrides();
  });

  it("SSOT bridge está vazio (nenhuma escala aplicada)", () => {
    expect(isCiSsotBridgeEmpty()).toBe(true);
  });

  it("merge sem overrides = piPalette", () => {
    const resolved = resolvePiPaletteForMode("dark");
    expect(resolved["blue-light"]).toBe(PI_PALETTE_OVERRIDES.dark["blue-light"]);
    expect(resolved["text-main"]).toBe(PI_PALETTE_OVERRIDES.dark["text-main"]);
  });

  it("user overrides ganham sobre piPalette", () => {
    setPiTokenOverride("dark", "blue-light", "#ff00ff");
    const resolved = resolvePiPaletteForMode("dark");
    expect(resolved["blue-light"]).toBe("#ff00ff");
    expect(resolvePiTokenSource("dark", "blue-light").layer).toBe("userOverrides");
  });

  it("rejeita token não editável", () => {
    setPiTokenOverride("dark", "not-a-real-token", "#000");
    expect(listOverriddenPiTokens("dark")).not.toContain("not-a-real-token");
  });

  it("camadas expõem piPalette e userOverrides", () => {
    const layers = getPiPaletteLayers("light");
    expect(Object.keys(layers.piPalette).length).toBeGreaterThan(10);
    expect(Object.keys(layers.ciSsotBridge).length).toBe(0);
    expect(Object.keys(layers.userOverrides).length).toBe(0);
  });
});
