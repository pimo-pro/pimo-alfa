/**
 * P3.9 F3a ? reconcilia??o ops Pe?as ? Unificado.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { settingsDefaults } from "../settings/settingsSchema";
import * as settingsService from "../settings/settingsService";
import { computeOperacoesFinanceiras } from "./computeOperacoesFinanceiras";
import type { CutListItemComPreco } from "../types";

function piece(
  partial: Partial<CutListItemComPreco> & { id: string }
): CutListItemComPreco {
  return {
    id: partial.id,
    nome: "p",
    tipo: "lateral_esquerda",
    material: "MDF",
    quantidade: partial.quantidade ?? 1,
    dimensoes: { largura: 500, altura: 700, profundidade: 18 },
    espessura: 18,
    precoUnitario: 0,
    precoTotal: 10,
    drillHoles: partial.drillHoles,
    ...partial,
  };
}

describe("P3.9 F3a operacoes reconciliation", () => {
  beforeEach(() => {
    vi.spyOn(settingsService, "getSettings").mockImplementation(() => ({
      ...settingsDefaults,
      orcamentos: {
        ...settingsDefaults.orcamentos,
        perfuracoes: {
          drillEurPorFuro: 0.05,
          nestingEurPorOperacao: 0.5,
        },
      },
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tarifas 0 ? precoTotal 0 (baseline Unificado)", () => {
    const cutlist = [piece({ id: "a", drillHoles: [{}, {}] as never })];
    const r = computeOperacoesFinanceiras(cutlist, {
      drillEurPorFuro: 0,
      nestingEurPorOperacao: 0,
      corteEurPorMetro: 0,
    });
    expect(r.precoTotal).toBe(0);
  });

  it("? eurByPieceId === precoTotal === Unificado.operacoes shape", () => {
    const cutlist = [
      piece({ id: "a", drillHoles: [{}, {}] as never }),
      piece({ id: "b" }),
    ];
    const r = computeOperacoesFinanceiras(cutlist);
    const sum = Math.round(
      [...r.eurByPieceId.values()].reduce((s, v) => s + v, 0) * 100
    ) / 100;
    expect(sum).toBe(r.precoTotal);
    expect(r.precoCNC + r.precoDrill).toBeCloseTo(r.precoTotal, 6);
    // Shape used by snapshot.operacoesBreakdown
    const breakdown = { cnc: r.precoCNC, drill: r.precoDrill, total: r.precoTotal };
    expect(breakdown.total).toBe(r.precoTotal);
  });
});
