import { describe, expect, it } from "vitest";
import { buildDrillFilesForProject } from "./drillExport";
import { buildPanelDrillingResult } from "../../modules/drilling/drillingAdapter";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { CutListItemComPreco } from "../types";
import { withIndustrialOutputAuthorization } from "../industrial/industrialOutputGuard";

/** Dimensões golden XML_COMPLITO LAT_ESQ. */
const LAT_ESQ_DIMS = { largura: 540, altura: 195.5, espessura: 16 } as const;

function buildLatEsqXml(): string {
  return withIndustrialOutputAuthorization("all", () => {
    const drilling = buildPanelDrillingResult(
      {
        tipo: "gaveta_lat_esq",
        larguraMm: LAT_ESQ_DIMS.largura,
        alturaMm: LAT_ESQ_DIMS.altura,
        espessuraMm: LAT_ESQ_DIMS.espessura,
      },
      defaultRulesConfig
    );
    expect(drilling.success).toBe(true);
    expect(drilling.data?.drillHoles.some((h) => h.holeType === "corredica")).toBe(false);
    expect(drilling.data?.drillHoles.every((h) => h.diameter !== 5)).toBe(true);

    const item: CutListItemComPreco = {
      id: "lat-esq-test",
      nome: "LAT_ESQ",
      tipo: "gaveta_lat_esq",
      quantidade: 1,
      dimensoes: {
        largura: LAT_ESQ_DIMS.largura,
        altura: LAT_ESQ_DIMS.altura,
        profundidade: LAT_ESQ_DIMS.espessura,
      },
      espessura: LAT_ESQ_DIMS.espessura,
      material: "mdf_branco",
      drillHoles: drilling.data!.drillHoles,
      precoUnitario: 0,
      precoTotal: 0,
    };

    const files = buildDrillFilesForProject([item], {
      projectName: "Teste",
      boxes: [],
      rules: defaultRulesConfig,
    });
    expect(files.length).toBeGreaterThanOrEqual(1);
    const drill = files.find((f) => f.machineTarget === "drill") ?? files[0]!;
    return drill.xml;
  });
}

describe("drillExport — LAT_ESQ alinhado com XML_COMPLITO", () => {
  it("painel KDT", () => {
    const xml = buildLatEsqXml();
    expect(xml).toContain("<PanelLength>540.00</PanelLength>");
    expect(xml).toContain("<PanelWidth>195.50</PanelWidth>");
  });

  it("6 CAD: face+aresta+2 rasgos (sem Ø5)", () => {
    const xml = buildLatEsqXml();
    expect((xml.match(/<CAD>/g) ?? []).length).toBe(6);
    expect(xml).not.toContain("<Diameter>5.00</Diameter>");
    expect(xml).toContain("<Depth>30.00</Depth>");
  });

  it("face X=T/2 TypeNo=1; aresta X=L TypeNo=2 Q1", () => {
    const xml = buildLatEsqXml();
    expect(xml).toContain("<TypeNo>1</TypeNo>");
    expect(xml).toContain("<X1>8.00</X1>");
    expect(xml).toContain("<X1>540.00</X1>");
    expect(xml).toContain("<Y1>15.00</Y1>");
    expect(xml).toContain("<Quadrant>1</Quadrant>");
  });

  it("rasgos W-13 e W-23 — overcut + Correction=2 + FRESA_DESBASTE_10MM", () => {
    const xml = buildLatEsqXml();
    expect(xml).toContain("<ToolName>FRESA_DESBASTE_10MM</ToolName>");
    expect(xml).toContain("<BeginX>550.00</BeginX>");
    expect(xml).toContain("<EndX>-10.00</EndX>");
    expect(xml).toContain("<BeginY>182.50</BeginY>");
    expect(xml).toContain("<BeginY>172.50</BeginY>");
    expect(xml).toContain("<Width>13.00</Width>");
    expect(xml).toContain("<Width>11.00</Width>");
    expect(xml).toContain("<Depth>3.00</Depth>");
    expect(xml).toContain("<Depth>10.00</Depth>");
    expect(xml).toContain("<Correction>2</Correction>");
    expect((xml.match(/<Correction>2<\/Correction>/g) ?? []).length).toBe(2);
  });
});
