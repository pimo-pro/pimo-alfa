import { describe, expect, it } from "vitest";
import { buildDrillFilesForProject } from "./drillExport";
import { buildPanelDrillingResult } from "../../modules/drilling/drillingAdapter";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { CutListItemComPreco } from "../types";

/** Dimensões do XML industrial LAT_DIR.xml (L=500, W=200, T=16). */
const LAT_DIR_DIMS = { largura: 500, altura: 200, espessura: 16 } as const;

function buildLatDirXml(): string {
  const drilling = buildPanelDrillingResult(
    {
      tipo: "gaveta_lat_dir",
      larguraMm: LAT_DIR_DIMS.largura,
      alturaMm: LAT_DIR_DIMS.altura,
      espessuraMm: LAT_DIR_DIMS.espessura,
    },
    defaultRulesConfig
  );
  expect(drilling.success).toBe(true);

  const item: CutListItemComPreco = {
    id: "lat-dir-test",
    nome: "LAT_DIR",
    tipo: "gaveta_lat_dir",
    quantidade: 1,
    dimensoes: {
      largura: LAT_DIR_DIMS.largura,
      altura: LAT_DIR_DIMS.altura,
      profundidade: LAT_DIR_DIMS.espessura,
    },
    espessura: LAT_DIR_DIMS.espessura,
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

describe("drillExport — LAT_DIR alinhado com XML industrial", () => {
  it("painel KDT: PanelLength=L, PanelWidth=W", () => {
    const xml = buildLatDirXml();
    expect(xml).toContain("<PanelLength>500.00</PanelLength>");
    expect(xml).toContain("<PanelWidth>200.00</PanelWidth>");
    expect(xml).toContain("<PanelThickness>16.00</PanelThickness>");
  });

  it("exclui corrediça do XML estrutural (5 blocos CAD activos)", () => {
    const xml = buildLatDirXml();
    expect((xml.match(/<CAD>/g) ?? []).length).toBe(5);
    expect(xml).not.toContain("<Diameter>5.00</Diameter>");
  });

  it("furos verticais TypeNo=1 em X=L-T/2 com Z1=0.00", () => {
    const xml = buildLatDirXml();
    expect(xml).toContain("<X1>492.00</X1>");
    expect(xml).toContain("<Y1>15.00</Y1>");
    expect(xml).toContain("<Y1>162.00</Y1>");
    expect(xml).toContain("<Z1>0.00</Z1>");
    expect(xml).not.toContain("<X1>8.00</X1>");
  });

  it("furos horizontais TypeNo=2 em X=0 com Quadrant 2", () => {
    const xml = buildLatDirXml();
    expect(xml).toContain("<X1>0.00</X1>");
    expect(xml).toContain("<Y1>15.00</Y1>");
    expect(xml).toContain("<Y1>165.00</Y1>");
    expect(xml).toContain("<Z1>8.00</Z1>");
    expect(xml).toContain("<Quadrant>2</Quadrant>");
    expect(xml).not.toContain("<Quadrant>1</Quadrant>");
  });

  it("rasgo TypeNo=3 com BeginX/EndX industrial (L+10, -10)", () => {
    const xml = buildLatDirXml();
    expect(xml).toContain("<BeginX>510.00</BeginX>");
    expect(xml).toContain("<EndX>-10.00</EndX>");
    expect(xml).toContain("<BeginY>187.00</BeginY>");
    expect(xml).toContain("<Width>13.00</Width>");
    expect(xml).toContain("<Depth>3.00</Depth>");
  });
});
