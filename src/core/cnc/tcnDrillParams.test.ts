import { describe, expect, it } from "vitest";
import {
  resolveTcnDrillDepthMm,
  resolveTcnDrillDiameterMm,
  TCN_PARAFUSO_DRILL_DIAMETER_MM,
} from "./tcnDrillParams";

describe("resolveTcnDrillDiameterMm", () => {
  it("força DR=5 para parafuso mesmo quando a origem tem 4mm", () => {
    expect(resolveTcnDrillDiameterMm({ diameter: 4, holeType: "parafuso" })).toBe(5);
    expect(resolveTcnDrillDiameterMm({ diameter: 4 })).toBe(5);
  });

  it("mantém diâmetros maiores (ex.: cavilha)", () => {
    expect(resolveTcnDrillDiameterMm({ diameter: 8, holeType: "cavilha" })).toBe(8);
  });
});

describe("resolveTcnDrillDepthMm", () => {
  it("usa espessura da chapa do material, ignorando hole.depth", () => {
    const depth = resolveTcnDrillDepthMm(
      { materialId: "mdf_branco", espessura_mm: 18 } as never,
      { espessura_mm: 19, largura_mm: 2800, altura_mm: 2070 }
    );
    expect(depth).toBeGreaterThan(0);
    expect(depth).not.toBe(12);
  });

  it("fallback para espessura da chapa do layout", () => {
    const depth = resolveTcnDrillDepthMm(
      {} as never,
      { espessura_mm: 19, largura_mm: 2800, altura_mm: 2070 }
    );
    expect(depth).toBe(19);
  });
});

describe("TCN_PARAFUSO_DRILL_DIAMETER_MM", () => {
  it("é 5mm", () => {
    expect(TCN_PARAFUSO_DRILL_DIAMETER_MM).toBe(5);
  });
});
