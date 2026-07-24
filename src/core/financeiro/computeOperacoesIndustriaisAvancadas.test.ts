import { describe, expect, it } from "vitest";
import type { CutListItemComPreco, PanelDrillHole } from "../types";
import { computeOperacoesIndustriaisAvancadas } from "./computeOperacoesIndustriaisAvancadas";
import { defaultOperacoesAvancadasSettings } from "../orcamentos";

function hole(partial: Partial<PanelDrillHole>): PanelDrillHole {
  return {
    x: 0,
    y: 0,
    diameter: partial.diameter ?? 5,
    depth: partial.depth ?? 12,
    ...partial,
  };
}

function piece(
  partial: Partial<CutListItemComPreco> & { id: string }
): CutListItemComPreco {
  return {
    id: partial.id,
    nome: partial.nome ?? "p",
    tipo: partial.tipo ?? "lateral_esquerda",
    material: "MDF",
    quantidade: partial.quantidade ?? 1,
    dimensoes: partial.dimensoes ?? { largura: 600, altura: 400, profundidade: 18 },
    espessura: 18,
    precoUnitario: 0,
    precoTotal: 0,
    ...partial,
  };
}

describe("computeOperacoesIndustriaisAvancadas (P3.9 F4)", () => {
  it("tarifas 0 ? total 0 (baseline)", () => {
    const cutlist = [
      piece({
        id: "a",
        drillHoles: [
          hole({ diameter: 5 }),
          hole({ holeType: "cavilha", diameter: 10, depth: 13 }),
          hole({ holeType: "dobradica", diameter: 35, depth: 13 }),
          hole({ holeSubtype: "groove", diameter: 0, grooveWidth: 4, grooveLength: 400 }),
        ],
      }),
    ];
    const r = computeOperacoesIndustriaisAvancadas(cutlist, defaultOperacoesAvancadasSettings());
    expect(r.precoTotal).toBe(0);
    expect(r.eurByPieceId.size).toBe(0);
  });

  it("calço: 6 furos ? 2 grupos", () => {
    const cutlist = [
      piece({
        id: "p1",
        drillHoles: Array.from({ length: 6 }, () =>
          hole({ holeType: "dobradica_fixacao", diameter: 5, depth: 12 })
        ),
      }),
    ];
    const r = computeOperacoesIndustriaisAvancadas(cutlist, {
      ...defaultOperacoesAvancadasSettings(),
      precoForoCalcoGrupo: 1.3,
    });
    expect(r.breakdown.calcoGrupos).toBe(2);
    expect(r.precoGrupos).toBe(2.6);
    expect(r.precoTotal).toBe(2.6);
  });

  it("dobradiça: 2 canecos ? 2 grupos (fixações excluídas de foro 5)", () => {
    const cutlist = [
      piece({
        id: "porta",
        drillHoles: [
          hole({ holeType: "dobradica", diameter: 35, depth: 13 }),
          hole({ holeType: "dobradica_fixacao", diameter: 5 }),
          hole({ holeType: "dobradica_fixacao", diameter: 5 }),
          hole({ holeType: "dobradica_fixacao", diameter: 5 }),
          hole({ holeType: "dobradica", diameter: 35, depth: 13 }),
          hole({ holeType: "dobradica_fixacao", diameter: 5 }),
          hole({ holeType: "dobradica_fixacao", diameter: 5 }),
          hole({ holeType: "dobradica_fixacao", diameter: 5 }),
        ],
      }),
    ];
    const r = computeOperacoesIndustriaisAvancadas(cutlist, {
      ...defaultOperacoesAvancadasSettings(),
      precoForoDobradicaGrupo: 2,
      precoForoCalcoGrupo: 1,
      precoForo5mm: 99,
    });
    expect(r.breakdown.dobradicaGrupos).toBe(2);
    expect(r.breakdown.calcoGrupos).toBe(2);
    expect(r.breakdown.foros5).toBe(0);
    expect(r.precoGrupos).toBe(2 * 2 + 2 * 1);
  });

  it("corte manual usa max(L,A)/1000", () => {
    const cutlist = [
      piece({
        id: "m",
        dimensoes: { largura: 800, altura: 400, profundidade: 18 },
        metadata: { manualCut: true },
      }),
    ];
    const r = computeOperacoesIndustriaisAvancadas(cutlist, {
      ...defaultOperacoesAvancadasSettings(),
      precoCorteManualPorMetro: 10,
    });
    expect(r.precoCorteManual).toBe(8);
    expect(r.breakdown.cortesM).toBe(0.8);
  });

  it("rasgo gaveta + cavilhas + quadrilha", () => {
    const cutlist = [
      piece({
        id: "g",
        drillHoles: [
          hole({ holeSubtype: "groove", diameter: 0, grooveWidth: 4, grooveLength: 500 }),
          hole({ holeType: "cavilha", diameter: 10, depth: 13 }),
          hole({ holeType: "cavilha", diameter: 10, depth: 30 }),
          hole({ diameter: 5 }),
        ],
      }),
      piece({ id: "q", tipo: "me_quadrilha", nome: "Me quadrilha" }),
    ];
    const r = computeOperacoesIndustriaisAvancadas(cutlist, {
      ...defaultOperacoesAvancadasSettings(),
      precoRasgoGaveta: 1.5,
      precoForoCavilha10x13: 0.4,
      precoForoCavilha10x30: 0.6,
      precoForo5mm: 0.2,
      precoMeQuadrilha: 3,
    });
    expect(r.precoRasgo).toBe(1.5);
    expect(r.precoForos).toBe(0.4 + 0.6 + 0.2);
    expect(r.precoQuadrilha).toBe(3);
    expect(r.precoTotal).toBe(1.5 + 1.2 + 3);
    const sumPieces =
      Math.round(
        [...r.eurByPieceId.values()].reduce((s, v) => s + v, 0) * 100
      ) / 100;
    expect(sumPieces).toBe(r.precoTotal);
  });
});
