import { describe, expect, it, beforeEach } from "vitest";
import { divSepRulesStore } from "../../admin/rules/divSepRules/rulesStore";
import { defaultRulesConfig } from "../rules/rulesConfig";
import { clearAllCutlistCache, cutlistComPrecoFromBox } from "../manufacturing/cutlistFromBoxes";
import { gerarPaineis } from "../manufacturing/boxManufacturing";
import { defaultDivisorItem, defaultSeparadorItem, makeDivSepTestBox } from "./divSepTestHelpers";
import { resolveSeparadorBottomY } from "./coupling";

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

  it("gerarPaineis cria exactamente N prateleiras no compartimento LAT+DIV+SEP", () => {
    const sep = defaultSeparadorItem({ id: "sep-panels", positionMm: 400 });
    const div = defaultDivisorItem({
      id: "div-panels",
      linkedSeparadorId: "sep-panels",
      prateleiraLado: "direita",
    });
    const box = makeDivSepTestBox({
      dimensoes: { largura: 600, altura: 900, profundidade: 560 },
      prateleiras: 2,
      separadores: [sep],
      divisores: [div],
    });
    const paineis = gerarPaineis(box, TALL_RULES);
    const shelves = paineis.filter((p) => p.tipo === "prateleira");
    expect(shelves).toHaveLength(2);
  });

  it("furos LAT de prateleira ficam abaixo do SEP e alinhados ao DIV", () => {
    const sep = defaultSeparadorItem({ id: "sep-align", positionMm: 1200 });
    const div = defaultDivisorItem({
      id: "div-align",
      linkedSeparadorId: "sep-align",
      prateleiraLado: "direita",
    });
    const box = makeDivSepTestBox({
      dimensoes: { largura: 600, altura: 2400, profundidade: 560 },
      prateleiras: 2,
      separadores: [sep],
      divisores: [div],
      panelIds: { divisores: ["pid-div-align"] },
    });
    const items = cutlistComPrecoFromBox(box, TALL_RULES);
    const lat = items.find((i) => i.tipo === "lateral_direita");
    const divItem = items.find((i) => i.tipo === "divisorio");
    const latYs = [
      ...new Set(
        (lat?.drillHoles ?? [])
          .filter((h) => h.holeType === "prateleira")
          .map((h) => Math.round((box.dimensoes.altura - h.y) * 1000) / 1000)
      ),
    ].sort((a, b) => a - b);
    const divYs = [
      ...new Set(
        (divItem?.drillHoles ?? [])
          .filter((h) => h.holeType === "prateleira")
          .map((h) => {
            const divH = divItem!.dimensoes.altura;
            const divBottom = box.espessura;
            const divTop = divBottom + divH;
            return Math.round((divTop - h.y) * 1000) / 1000;
          })
      ),
    ].sort((a, b) => a - b);
    const sepBottom = resolveSeparadorBottomY(box, sep);
    expect(latYs.length).toBeGreaterThan(0);
    expect(latYs).toEqual(divYs);
    expect(latYs.every((y) => y < sepBottom)).toBe(true);
  });
});
