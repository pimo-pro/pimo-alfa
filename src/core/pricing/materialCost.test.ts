import { describe, expect, it } from "vitest";
import { calculateMaterialCost, DEFAULT_MATERIAL_COST_CONFIG } from "./materialCost";

describe("pricing/materialCost", () => {
  it("calcula área e custo a partir da cutlist wood", () => {
    const breakdown = calculateMaterialCost(
      [
        {
          codigo: "gav_fren",
          nome: "Frente",
          quantidade: 1,
          larguraMm: 500,
          alturaMm: 140,
          profundidadeMm: 19,
          espessuraMm: 19,
          material: "mdf_branco",
          kind: "wood",
        },
        {
          codigo: "gav_fun",
          nome: "Fundo",
          quantidade: 1,
          larguraMm: 450,
          alturaMm: 10,
          profundidadeMm: 400,
          espessuraMm: 10,
          material: "hdf_cru",
          kind: "wood",
        },
        {
          codigo: "runner",
          nome: "Corrediça",
          quantidade: 1,
          larguraMm: 1,
          alturaMm: 1,
          profundidadeMm: 1,
          espessuraMm: 1,
          material: "metal",
          kind: "metal",
        },
      ],
      DEFAULT_MATERIAL_COST_CONFIG
    );

    expect(breakdown.pieces).toHaveLength(2);
    expect(breakdown.totalAreaM2).toBeGreaterThan(0);
    expect(breakdown.totalWoodCost).toBeGreaterThan(0);
    expect(breakdown.wasteFactor).toBe(DEFAULT_MATERIAL_COST_CONFIG.wasteFactor);
  });
});
