import { describe, expect, it } from "vitest";
import {
  DRAWER_METAL_BOX_PROFILES,
  listMetalBoxProfilesForType,
  pickCompatibleMetalDepth,
  resolveMetalBoxHeightMm,
  resolveMetalBoxProfile,
} from "./drawerMetalBoxCatalog";

describe("drawerMetalBoxCatalog", () => {
  it("inclui perfis Blum, Hettich e Grass", () => {
    const types = new Set(DRAWER_METAL_BOX_PROFILES.map((p) => p.catalogType));
    expect(types.has("Blum Legrabox")).toBe(true);
    expect(types.has("Blum Antaro")).toBe(true);
    expect(types.has("Blum Metabox")).toBe(true);
    expect(types.has("Hettich InnoTech")).toBe(true);
    expect(types.has("Hettich ArciTech")).toBe(true);
    expect(types.has("Grass Nova Pro")).toBe(true);
    expect(types.has("Grass Vionaro")).toBe(true);
  });

  it("Legrabox tem alturas industriais 83–224 mm", () => {
    const profile = resolveMetalBoxProfile("Blum Legrabox");
    expect(profile?.id).toBe("blum_legrabox");
    expect(profile?.allowedHeightsMm).toEqual([83, 96, 128, 177, 224]);
    expect(profile?.slideOffsetFrontMm).toBe(37);
    expect(profile?.frontHoles).toHaveLength(2);
  });

  it("resolve altura ao valor permitido mais próximo", () => {
    const profile = resolveMetalBoxProfile("Hettich ArciTech")!;
    expect(resolveMetalBoxHeightMm(profile, 130)).toBe(128);
    expect(resolveMetalBoxHeightMm(profile, 170)).toBe(160);
  });

  it("escolhe profundidade compatível ≤ preferida", () => {
    const profile = resolveMetalBoxProfile("Blum Legrabox")!;
    expect(pickCompatibleMetalDepth(profile, 520)).toBe(500);
    expect(pickCompatibleMetalDepth(profile, 680)).toBe(650);
  });

  it("lista perfis por tipo de catálogo", () => {
    expect(listMetalBoxProfilesForType("Blum Legrabox")).toHaveLength(1);
    expect(listMetalBoxProfilesForType("Nenhuma")).toHaveLength(0);
  });
});
