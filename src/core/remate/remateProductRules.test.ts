import { describe, it, expect } from "vitest";
import {
  buildProductPieceSpecs,
  computeDimensionsForProduct,
  deriveLegacyTipo,
  inferProductTypeFromLegacy,
} from "./remateProductRules";

describe("remateProductRules", () => {
  it("Completo com top/bottom gera 3 peças", () => {
    const specs = buildProductPieceSpecs({
      productType: "COMPLETO",
      mountSlot: "FRENTE",
      productOptions: { includeTopBottomRemates: true },
    });
    expect(specs).toHaveLength(3);
    expect(specs.map((s) => s.partRole)).toEqual(["MAIN", "TOP", "BOTTOM"]);
  });

  it("Avista frente usa espessura do material como profundidade 3D", () => {
    const dims = computeDimensionsForProduct({
      box: null,
      productType: "AVISTA",
      mountSlot: "FRENTE",
      thicknessMm: 19,
      productOptions: { avistaWidthMm: 100 },
    });
    expect(dims.depth).toBe(19);
  });

  it("inferProductTypeFromLegacy mapeia DIR para AVISTA", () => {
    expect(inferProductTypeFromLegacy({ tipo: "DIR" })).toBe("AVISTA");
  });

  it("deriveLegacyTipo FRENTE", () => {
    expect(deriveLegacyTipo("AVISTA", "FRENTE")).toBe("FRENTE");
  });
});
