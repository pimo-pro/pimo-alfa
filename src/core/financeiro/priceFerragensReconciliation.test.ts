/**
 * P3.9 F2 — reconciliação ? Peças.ferragens == Unificado.ferragens com flag on.
 * Usa cutlist directa no SSOT (evita gerarModeloIndustrial / rules incompletas).
 */

import { describe, expect, it } from "vitest";
import { FERRAGENS_DEFAULT } from "../ferragens/ferragens";
import { COMPONENT_TYPES_DEFAULT } from "../components/componentTypes";
import type { CutListItemComPreco } from "../types";
import { priceFerragensFromCatalog } from "./priceFerragensFromCatalog";

function piece(
  partial: Partial<CutListItemComPreco> & { id: string; tipo: string }
): CutListItemComPreco {
  return {
    id: partial.id,
    nome: partial.nome ?? partial.tipo,
    tipo: partial.tipo,
    material: "MDF",
    quantidade: partial.quantidade ?? 1,
    dimensoes: { largura: 600, altura: 400, profundidade: 18 },
    espessura: 18,
    precoUnitario: 0,
    precoTotal: 0,
    ...partial,
  };
}

describe("P3.9 F2 ferragens reconciliation (SSOT)", () => {
  it("? eurByPieceId === totalEur (same function used by Unificado + Peças)", () => {
    const cutlist = [
      piece({ id: "a", tipo: "porta_simples" }),
      piece({ id: "b", tipo: "prateleira" }),
      piece({ id: "c", tipo: "cima" }),
      piece({ id: "d", tipo: "lateral_esquerda" }),
    ];
    const priced = priceFerragensFromCatalog({
      cutlist,
      componentTypes: COMPONENT_TYPES_DEFAULT,
      catalog: FERRAGENS_DEFAULT,
    });
    const sumPieces = Math.round(
      [...priced.eurByPieceId.values()].reduce((s, v) => s + v, 0) * 100
    ) / 100;
    expect(sumPieces).toBe(priced.totalEur);
  });
});
