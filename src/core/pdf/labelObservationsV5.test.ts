import { describe, it, expect } from "vitest";
import { collectObservationsForItem } from "../observacoes/ObservacoesService";

/** Compatibilidade — testes legados redireccionados para ObservacoesService. */
describe("labelObservationsV5 (compat)", () => {
  it("recolhe de pieceObservacoes", () => {
    const obs = collectObservationsForItem(
      { metadata: { panelId: "p1" } },
      undefined,
      { p1: ["Verificar orla"] }
    );
    expect(obs).toEqual(["Verificar orla"]);
  });

  it("limita a 3 entradas", () => {
    const obs = collectObservationsForItem(
      { id: "p1", metadata: { panelId: "p1" } },
      undefined,
      { p1: ["1", "2", "3", "4"] }
    );
    expect(obs).toHaveLength(3);
    expect(obs).toEqual(["1", "2", "3"]);
  });
});
