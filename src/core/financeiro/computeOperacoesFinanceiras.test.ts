import { describe, expect, it } from "vitest";
import type { CutListItemComPreco } from "../types";
import { computeOperacoesFinanceiras } from "./computeOperacoesFinanceiras";

function piece(
  partial: Partial<CutListItemComPreco> & { id: string }
): CutListItemComPreco {
  return {
    id: partial.id,
    nome: partial.nome ?? "peca",
    tipo: partial.tipo ?? "lateral_esquerda",
    material: "MDF",
    quantidade: partial.quantidade ?? 1,
    dimensoes: partial.dimensoes ?? { largura: 600, altura: 400, profundidade: 18 },
    espessura: partial.espessura ?? 18,
    precoUnitario: 0,
    precoTotal: 0,
    drillHoles: partial.drillHoles,
    ...partial,
  };
}

describe("computeOperacoesFinanceiras (P3.9 F3a)", () => {
  it("tarifas 0 → tudo zero (baseline Unificado)", () => {
    const cutlist = [
      piece({ id: "a", drillHoles: [{ x: 1 } as never, { x: 2 } as never] }),
      piece({ id: "b" }),
    ];
    const r = computeOperacoesFinanceiras(cutlist, {
      drillEurPorFuro: 0,
      nestingEurPorOperacao: 0,
      corteEurPorMetro: 0,
    });
    expect(r.precoCNC).toBe(0);
    expect(r.precoDrill).toBe(0);
    expect(r.precoTotal).toBe(0);
    expect(r.eurByPieceId.size).toBe(0);
  });

  it("CNC = perímetro × €/m; Drill = furos reais (sem grooves)", () => {
    const cutlist = [
      piece({
        id: "p1",
        quantidade: 2,
        dimensoes: { largura: 1000, altura: 500, profundidade: 18 },
        drillHoles: [
          { x: 1 },
          { x: 2 },
          { x: 3, holeSubtype: "groove" },
        ] as CutListItemComPreco["drillHoles"],
      }),
    ];
    const r = computeOperacoesFinanceiras(cutlist, {
      corteEurPorMetro: 0.5,
      drillEurPorFuro: 0.05,
      nestingEurPorOperacao: 99, // legado ignorado
    });
    // perímetro = 2*(1+0.5)=3 m × 0.5 × 2 = 3; drill = 2 furos × 0.05 × 2 = 0.2
    expect(r.precoCNC).toBe(3);
    expect(r.precoDrill).toBe(0.2);
    expect(r.precoTotal).toBe(3.2);
  });

  it("Σ eurByPieceId === precoTotal", () => {
    const cutlist = [
      piece({ id: "a", drillHoles: [{}] as CutListItemComPreco["drillHoles"] }),
      piece({ id: "b" }),
      piece({ id: "c", dimensoes: { largura: 0, altura: 0, profundidade: 0 }, espessura: 0 }),
    ];
    const r = computeOperacoesFinanceiras(cutlist, {
      corteEurPorMetro: 1,
      drillEurPorFuro: 2,
      nestingEurPorOperacao: 0,
    });
    let sum = 0;
    for (const v of r.eurByPieceId.values()) sum += v;
    expect(Math.round(sum * 100) / 100).toBe(r.precoTotal);
  });
});
