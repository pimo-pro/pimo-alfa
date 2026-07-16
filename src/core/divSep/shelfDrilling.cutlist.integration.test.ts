import { describe, expect, it, beforeEach } from "vitest";
import { divSepRulesStore } from "../../admin/rules/divSepRules/rulesStore";
import { defaultRulesConfig } from "../rules/rulesConfig";
import { clearAllCutlistCache, cutlistComPrecoFromBox } from "../manufacturing/cutlistFromBoxes";
import { defaultDivisorItem, defaultSeparadorItem, makeDivSepTestBox } from "./divSepTestHelpers";

/** Caixa alta: compartimento abaixo do SEP cabe nas margens industriais 200/200. */
const TALL_RULES = defaultRulesConfig;

describe("cutlist merge — furos de prateleira no DIV", () => {
  beforeEach(() => {
    divSepRulesStore.patch({ enableShelfHoles: true });
    clearAllCutlistCache();
  });

  it("DIV na cutlist recebe furos no lado das prateleiras (face A à direita)", () => {
    const sep = defaultSeparadorItem({ id: "sep-tall", positionMm: 1200 });
    const div = defaultDivisorItem({
      id: "uuid-div",
      linkedSeparadorId: "sep-tall",
      prateleiraLado: "direita",
    });
    const box = makeDivSepTestBox({
      dimensoes: { largura: 600, altura: 2400, profundidade: 560 },
      prateleiras: 2,
      separadores: [sep],
      divisores: [div],
    });
    // Simula caixa live sem panelIds.divisores preenchidos
    box.panelIds = { ...box.panelIds!, divisores: [] };

    const items = cutlistComPrecoFromBox(box, TALL_RULES);
    const divItem = items.find((i) => i.tipo === "divisorio");
    const lat = items.find((i) => i.tipo === "lateral_direita");
    const divShelf = (divItem?.drillHoles ?? []).filter((h) => h.holeType === "prateleira");
    const latShelf = (lat?.drillHoles ?? []).filter((h) => h.holeType === "prateleira");

    expect(latShelf.length).toBeGreaterThan(0);
    expect(divShelf.length).toBeGreaterThan(0);
    expect(divShelf.every((h) => h.face === "A")).toBe(true);
    expect(divItem?.metadata?.panelId).toBe("divisorio-1");
  });
});
