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

  it("Completo lateral usa comprimento vertical e largura de profundidade", () => {
    const dims = computeDimensionsForProduct({
      box: {
        id: "b1",
        dimensoes: { largura: 600, altura: 720, profundidade: 500 },
      } as never,
      productType: "COMPLETO",
      mountSlot: "DIR",
      thicknessMm: 19,
      productOptions: { completoRules: { backExtraMm: 50 } as never },
    });
    expect(dims.width).toBeGreaterThan(700);
    expect(dims.height).toBeGreaterThan(500);
    expect(dims.depth).toBe(19);
  });

  it("Remate cima usa profundidade avista de 100 mm", () => {
    const dims = computeDimensionsForProduct({
      box: {
        id: "b1",
        dimensoes: { largura: 600, altura: 720, profundidade: 500 },
      } as never,
      productType: "AVISTA",
      mountSlot: "CIMA",
      thicknessMm: 19,
    });
    expect(dims.width).toBe(600);
    expect(dims.height).toBe(19);
    expect(dims.depth).toBe(100);
  });

  it("inferProductTypeFromLegacy mapeia DIR para AVISTA", () => {
    expect(inferProductTypeFromLegacy({ tipo: "DIR" })).toBe("AVISTA");
  });

  it("deriveLegacyTipo FRENTE", () => {
    expect(deriveLegacyTipo("AVISTA", "FRENTE")).toBe("FRENTE");
  });
});
