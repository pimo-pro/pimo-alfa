import { describe, expect, it } from "vitest";

import { isCarcassPanelForAdminCost, isDoorPieceForAdminCost } from "./cutlistAdminCostPartition";

describe("cutlistAdminCostPartition — Portas vs Painéis (opção 1)", () => {
  it("classifica folhas de porta como Portas, não Painéis", () => {
    for (const tipo of ["porta_simples", "porta_dupla", "porta_correr", "porta_inferior", "porta_superior"]) {
      expect(isDoorPieceForAdminCost(tipo)).toBe(true);
      expect(isCarcassPanelForAdminCost(tipo)).toBe(false);
    }
  });

  it("classifica carcaça como Painéis", () => {
    for (const tipo of ["lateral_esquerda", "cima", "fundo", "COSTA", "prateleira", "separador"]) {
      expect(isCarcassPanelForAdminCost(tipo)).toBe(true);
      expect(isDoorPieceForAdminCost(tipo)).toBe(false);
    }
  });

  it("classifica gavetas fora de Painéis (bucket próprio)", () => {
    expect(isCarcassPanelForAdminCost("gaveta_frente_ext")).toBe(false);
    expect(isCarcassPanelForAdminCost("gaveta_lat_esq")).toBe(false);
  });
});
