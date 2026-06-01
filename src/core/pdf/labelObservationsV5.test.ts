import { describe, it, expect } from "vitest";
import { collectObservationsForItem } from "./labelObservationsV5";

describe("collectObservationsForItem", () => {
  it("recolhe observacao de metadata", () => {
    const obs = collectObservationsForItem({
      metadata: { observacao: "  Verificar orla  " },
    });
    expect(obs).toEqual(["Verificar orla"]);
  });

  it("recolhe observacoesPadrao de rules (string e array)", () => {
    expect(
      collectObservationsForItem(
        { metadata: { observacao: "A" } },
        { etiqueta: { observacoesPadrao: "Padrão" } }
      )
    ).toEqual(["A", "Padrão"]);

    expect(
      collectObservationsForItem({}, { etiqueta: { observacoesPadrao: ["X", "Y"] } })
    ).toEqual(["X", "Y"]);
  });

  it("limita a 3 entradas", () => {
    const obs = collectObservationsForItem(
      {},
      { etiqueta: { observacoesPadrao: ["1", "2", "3", "4"] } }
    );
    expect(obs).toHaveLength(3);
    expect(obs).toEqual(["1", "2", "3"]);
  });
});
