import { describe, expect, it, vi } from "vitest";
import type { CutListItemComPreco } from "../types";
import {
  deriveCustoChapaReal,
  resolveDominantMaterialFromCutlist,
} from "./deriveCustoChapaReal";

vi.mock("../pricing/pricing", () => ({
  getPrecoPorMaterial: () => 31,
}));

vi.mock("../cnc/cncPipeline", () => ({
  getSheetDefinitionFromSettings: () => ({
    largura_mm: 2800,
    altura_mm: 2070,
    espessura_mm: 19,
  }),
}));

function piece(
  partial: Partial<CutListItemComPreco> & { id: string; w?: number; h?: number; material?: string }
): CutListItemComPreco {
  return {
    id: partial.id,
    nome: "p",
    tipo: "lateral_esquerda",
    material: partial.material ?? "mdf_branco",
    quantidade: 1,
    dimensoes: {
      largura: partial.w ?? 600,
      altura: partial.h ?? 400,
      profundidade: 19,
    },
    espessura: 19,
    precoUnitario: 0,
    precoTotal: 10,
    ...partial,
  };
}

describe("deriveCustoChapaReal", () => {
  it("escolhe material dominante por área", () => {
    const cutlist = [
      piece({ id: "a", material: "mdf_branco", w: 1000, h: 1000 }),
      piece({ id: "b", material: "carvalho", w: 100, h: 100 }),
    ];
    const d = resolveDominantMaterialFromCutlist(cutlist);
    expect(d.materialKey).toBe("mdf_branco");
  });

  it("custoChapaReal = €/m² × área chapa (sem tarifa nova)", () => {
    const cutlist = [piece({ id: "a", material: "mdf_branco" })];
    const r = deriveCustoChapaReal({
      cutlist,
      sheetLarguraMm: 2800,
      sheetAlturaMm: 2070,
    });
    const area = (2.8 * 2.07);
    expect(r.eurM2).toBe(31);
    expect(r.sheetAreaM2).toBeCloseTo(area, 5);
    expect(r.custoChapaReal).toBe(Math.round(31 * area * 100) / 100);
    expect(r.warnings).toHaveLength(0);
  });

  it("sem material → 0 + warning", () => {
    const r = deriveCustoChapaReal({ cutlist: [] });
    expect(r.custoChapaReal).toBe(0);
    expect(r.warnings.some((w) => w.includes("sem material"))).toBe(true);
  });
});
