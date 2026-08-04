import { describe, expect, it } from "vitest";
import type { CutListItemComPreco } from "../types";
import {
  assertNoMaterialDoubleCount,
  computeCustosAvancadosFinanceiras,
  MO_MINUTOS_POR_FURO,
  MO_MINUTOS_POR_PECA_CNC,
} from "./computeCustosAvancadosFinanceiras";

function piece(
  partial: Partial<CutListItemComPreco> & {
    id: string;
    w?: number;
    h?: number;
    qty?: number;
    holes?: number;
  }
): CutListItemComPreco {
  const w = partial.w ?? 600;
  const h = partial.h ?? 400;
  const holes = partial.holes ?? 0;
  return {
    id: partial.id,
    nome: "p",
    tipo: "lateral_esquerda",
    material: "MDF",
    quantidade: partial.qty ?? 1,
    dimensoes: { largura: w, altura: h, profundidade: 18 },
    espessura: 18,
    precoUnitario: 0,
    precoTotal: 10,
    drillHoles:
      holes > 0
        ? Array.from({ length: holes }, (_, i) => ({
            id: `h${i}`,
            x: i,
            y: 0,
            diametro: 5,
            profundidade: 10,
          }))
        : undefined,
    ...partial,
  };
}

function sumMap(m: Map<string, number>): number {
  return Math.round([...m.values()].reduce((s, v) => s + v, 0) * 100) / 100;
}

describe("computeCustosAvancadosFinanceiras (P3.9 F3c)", () => {
  it("defaults / flags off → euros 0 (baseline)", () => {
    const cutlist = [piece({ id: "a" }), piece({ id: "b", w: 300, h: 200 })];
    const r = computeCustosAvancadosFinanceiras({
      cutlist,
      chapasCount: 3,
      chapasModeReal: true,
      pesoTotalKg: 40,
      custoChapaRealDerived: 50,
      tarifas: {
        materialCostMode: "por_peca",
        valorHoraMaquina: 35,
        custoLogisticaPorKg: 1,
        enableMaoDeObra: false,
        enableLogistica: false,
      },
    });
    expect(r.suppressPieceMaterial).toBe(false);
    expect(r.precoChapasReais).toBe(0);
    expect(r.precoMaoDeObra).toBe(0);
    expect(r.precoLogistica).toBe(0);
    expect(r.warnings.some((w) => w.includes("enableMaoDeObra"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("enableLogistica"))).toBe(true);
  });

  it("por_chapas_reais → chapasReais = count × derivado + suppress material", () => {
    const cutlist = [
      piece({ id: "a", w: 1000, h: 1000 }),
      piece({ id: "b", w: 1000, h: 1000 }),
    ];
    const r = computeCustosAvancadosFinanceiras({
      cutlist,
      chapasCount: 4,
      chapasModeReal: true,
      pesoTotalKg: 10,
      custoChapaRealDerived: 25,
      tarifas: {
        materialCostMode: "por_chapas_reais",
        enableMaoDeObra: false,
        enableLogistica: false,
      },
    });
    expect(r.suppressPieceMaterial).toBe(true);
    expect(r.precoChapasReais).toBe(100);
    expect(sumMap(r.chapasByPieceId)).toBe(100);
    assertNoMaterialDoubleCount({
      pieceMaterialSum: 0,
      chapasReais: r.precoChapasReais,
    });
  });

  it("por_chapas_reais sem derivado → chapasReais 0 + warning", () => {
    const r = computeCustosAvancadosFinanceiras({
      cutlist: [piece({ id: "a" })],
      chapasCount: 3,
      chapasModeReal: true,
      pesoTotalKg: 1,
      tarifas: {
        materialCostMode: "por_chapas_reais",
        enableMaoDeObra: false,
        enableLogistica: false,
      },
    });
    expect(r.precoChapasReais).toBe(0);
    expect(r.suppressPieceMaterial).toBe(true);
    expect(r.warnings.some((w) => w.includes("derivado=0"))).toBe(true);
  });

  it("anti-double-count assert falha se ambos > 0", () => {
    expect(() =>
      assertNoMaterialDoubleCount({ pieceMaterialSum: 10, chapasReais: 5 })
    ).toThrow(/anti-double-count/);
  });

  it("MO flag on → tempo × valorHora; peças == total", () => {
    const cutlist = [
      piece({ id: "a", holes: 10 }), // 2 + 1 = 3 min
      piece({ id: "b", holes: 0 }), // 2 min
    ];
    const r = computeCustosAvancadosFinanceiras({
      cutlist,
      chapasCount: 0,
      chapasModeReal: false,
      pesoTotalKg: 0,
      tarifas: {
        materialCostMode: "por_peca",
        enableMaoDeObra: true,
        valorHoraMaquina: 60, // 1 €/min
        enableLogistica: false,
      },
    });
    const expectedMin =
      MO_MINUTOS_POR_PECA_CNC * 2 + MO_MINUTOS_POR_FURO * 10;
    expect(r.minutosEstimados).toBe(expectedMin);
    expect(r.precoMaoDeObra).toBe(Math.round((expectedMin / 60) * 60 * 100) / 100);
    expect(sumMap(r.maoDeObraByPieceId)).toBe(r.precoMaoDeObra);
  });

  it("logistica flag on → peso × €/kg; peças == total", () => {
    const cutlist = [
      piece({ id: "a", w: 1000, h: 1000 }),
      piece({ id: "b", w: 1000, h: 1000 }),
    ];
    const pesoByPieceId = new Map([
      ["a", 10],
      ["b", 30],
    ]);
    const r = computeCustosAvancadosFinanceiras({
      cutlist,
      chapasCount: 0,
      chapasModeReal: false,
      pesoTotalKg: 40,
      pesoByPieceId,
      tarifas: {
        materialCostMode: "por_peca",
        enableMaoDeObra: false,
        enableLogistica: true,
        custoLogisticaPorKg: 0.5,
      },
    });
    expect(r.precoLogistica).toBe(20);
    expect(sumMap(r.logisticaByPieceId)).toBe(20);
    expect(r.logisticaByPieceId.get("a")).toBe(5);
    expect(r.logisticaByPieceId.get("b")).toBe(15);
  });

  it("por_chapas_reais sem sheets reais → chapasReais 0 + warning", () => {
    const r = computeCustosAvancadosFinanceiras({
      cutlist: [piece({ id: "a" })],
      chapasCount: 0,
      chapasModeReal: false,
      pesoTotalKg: 1,
      custoChapaRealDerived: 40,
      tarifas: {
        materialCostMode: "por_chapas_reais",
        enableMaoDeObra: false,
        enableLogistica: false,
      },
    });
    expect(r.precoChapasReais).toBe(0);
    expect(r.suppressPieceMaterial).toBe(true);
    expect(r.warnings.some((w) => w.includes("sem chapas reais"))).toBe(true);
  });
});
