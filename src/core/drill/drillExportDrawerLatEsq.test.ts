import { describe, expect, it } from "vitest";
import { buildDrillFilesForProject } from "./drillExport";
import { buildPanelDrillingResult } from "../../modules/drilling/drillingAdapter";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { CutListItemComPreco } from "../types";

/** Dimensões do XML industrial LAT_ESQ.xml (L=500, W=200, T=16). */
const LAT_ESQ_DIMS = { largura: 500, altura: 200, espessura: 16 } as const;

function buildLatEsqXml(): string {
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
  expect(drilling.data?.drillHoles.some((h) => h.holeType === "corredica")).toBe(true);

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
  expect(files).toHaveLength(1);
  return files[0].xml;
}

describe("drillExport — LAT_ESQ alinhado com XML industrial", () => {
  it("painel KDT: PanelLength=L, PanelWidth=W", () => {
    const xml = buildLatEsqXml();
    expect(xml).toContain("<PanelLength>500.00</PanelLength>");
    expect(xml).toContain("<PanelWidth>200.00</PanelWidth>");
    expect(xml).toContain("<PanelThickness>16.00</PanelThickness>");
  });

  it("exclui corrediça do XML estrutural (5 blocos CAD activos)", () => {
    const xml = buildLatEsqXml();
    const cadCount = (xml.match(/<CAD>/g) ?? []).length;
    expect(cadCount).toBe(5);
    expect(xml).not.toContain("<Diameter>5.00</Diameter>");
  });

  it("furos verticais TypeNo=1 com Z1=0.00", () => {
    const xml = buildLatEsqXml();
    expect(xml).toContain("<X1>8.00</X1>");
    expect(xml).toContain("<Y1>15.00</Y1>");
    expect(xml).toContain("<Y1>162.00</Y1>");
    expect(xml).toContain("<Z1>0.00</Z1>");
    expect(xml).toContain("<Depth>13.00</Depth>");
  });

  it("furos horizontais TypeNo=2 na costa (X=L, Y=15 e W-35)", () => {
    const xml = buildLatEsqXml();
    expect(xml).toContain("<X1>500.00</X1>");
    expect(xml).toContain("<Y1>15.00</Y1>");
    expect(xml).toContain("<Y1>165.00</Y1>");
    expect(xml).toContain("<Z1>8.00</Z1>");
    expect(xml).toContain("<Quadrant>1</Quadrant>");
    expect(xml).toContain("<Depth>30.00</Depth>");
  });

  it("rasgo TypeNo=3 com BeginX/EndX industrial (L+10, -10)", () => {
    const xml = buildLatEsqXml();
    expect(xml).toContain("<TypeNo>3</TypeNo>");
    expect(xml).toContain("<BeginX>510.00</BeginX>");
    expect(xml).toContain("<EndX>-10.00</EndX>");
    expect(xml).toContain("<BeginY>187.00</BeginY>");
    expect(xml).toContain("<EndY>187.00</EndY>");
    expect(xml).toContain("<Width>13.00</Width>");
    expect(xml).toContain("<Depth>3.00</Depth>");
    expect(xml).not.toContain("<X1>0.00</X1>");
    expect(xml).not.toContain("<X2>");
  });
});
