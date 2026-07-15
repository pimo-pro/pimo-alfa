import { describe, expect, it } from "vitest";
import type { CutListItemComPreco } from "../types";
import { defaultRulesConfig } from "../rules/rulesConfig";
import { buildDivSepDrilling } from "../divSep/drilling";
import {
  defaultDivisorItem,
  defaultSeparadorItem,
  DIV_SEP_TEST_RULES,
  makeDivSepTestBox,
} from "../divSep/divSepTestHelpers";
import { buildDrillFilesForProject } from "./drillExport";

function makeFundoItem(
  boxId: string,
  drillHoles: CutListItemComPreco["drillHoles"]
): CutListItemComPreco {
  return {
    id: `${boxId}-fundo`,
    nome: "FUNDO",
    boxId,
    tipo: "fundo",
    quantidade: 1,
    dimensoes: { largura: 562, altura: 536, profundidade: 19 },
    espessura: 19,
    materialId: "mdf_branco",
    material: "MDF Branco",
    precoUnitario: 0,
    precoTotal: 0,
    drillHoles,
    metadata: { qrCode: "TEST_FUNDO_01" },
  };
}

describe("buildDrillFilesForProject — furos de bordo DIV/SEP", () => {
  const project = {
    projectName: "TEST",
    boxes: [] as never[],
    rules: defaultRulesConfig,
  };

  it("DIV isolado: parafuso de bordo em FUNDO exporta TypeNo 2 (horizontal)", () => {
    const box = makeDivSepTestBox({ divisores: [defaultDivisorItem()] });
    const { getExtraHoles } = buildDivSepDrilling(box, box.panelIds, DIV_SEP_TEST_RULES);
    const fundoHoles = getExtraHoles("fundo");
    expect(fundoHoles.some((h) => h.holeType === "parafuso" && h.topDrillable === false)).toBe(true);

    const files = buildDrillFilesForProject([makeFundoItem(box.id, fundoHoles)], project);
    expect(files.length).toBe(1);
    const xml = files[0]!.xml;
    expect(xml).toContain("<TypeNo>2</TypeNo>");
    expect(xml).not.toMatch(/parafuso[\s\S]*<TypeNo>1<\/TypeNo>/);
    const parafusoBlocks = xml.match(/<TypeNo>2<\/TypeNo>[\s\S]*?<Diameter>5\.00<\/Diameter>/g) ?? [];
    expect(parafusoBlocks.length).toBeGreaterThan(0);
  });

  it("SEP+DIV: parafuso de bordo em FUNDO exporta TypeNo 2 (horizontal)", () => {
    const sep = defaultSeparadorItem({ id: "sep-xml", positionMm: 600 });
    const div = defaultDivisorItem({
      id: "div-xml",
      linkedSeparadorId: "sep-xml",
      positionMm: 281,
    });
    const box = makeDivSepTestBox({
      dimensoes: { largura: 600, altura: 720, profundidade: 560 },
      separadores: [sep],
      divisores: [div],
    });
    const { getExtraHoles } = buildDivSepDrilling(box, box.panelIds, DIV_SEP_TEST_RULES);
    const fundoHoles = getExtraHoles("fundo");
    expect(fundoHoles.filter((h) => h.holeType === "parafuso").length).toBeGreaterThan(0);

    const files = buildDrillFilesForProject([makeFundoItem(box.id, fundoHoles)], project);
    const xml = files[0]!.xml;
    expect(xml).toContain("<TypeName>Horizontal Hole</TypeName>");
    expect(xml.match(/<TypeNo>1<\/TypeNo>/g)?.length ?? 0).toBe(0);
  });
});
