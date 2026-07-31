import { describe, expect, it } from "vitest";
import { buildDrillFilesForProject } from "./drillExport";
import { buildPanelDrillingResult } from "../../modules/drilling/drillingAdapter";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { CutListItemComPreco } from "../types";
import { withIndustrialOutputAuthorization } from "../industrial/industrialOutputGuard";

/** Dimensões golden XML_COMPLITO LAT_DIR (L=540, W=195.5, T=16). */
const LAT_DIR_DIMS = { largura: 540, altura: 195.5, espessura: 16 } as const;

function buildLatDirXml(): string {
  return withIndustrialOutputAuthorization("all", () => {
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
    expect(files.length).toBeGreaterThanOrEqual(1);
    const drill = files.find((f) => f.machineTarget === "drill") ?? files[0]!;
    return drill.xml;
  });
}

describe("drillExport — LAT_DIR alinhado com XML_COMPLITO", () => {
  it("painel KDT: PanelLength=L, PanelWidth=W", () => {
    const xml = buildLatDirXml();
    expect(xml).toContain("<PanelLength>540.00</PanelLength>");
    expect(xml).toContain("<PanelWidth>195.50</PanelWidth>");
    expect(xml).toContain("<PanelThickness>16.00</PanelThickness>");
  });

  it("6 CAD: 2 face + 2 aresta + 2 rasgos (sem Ø5)", () => {
    const xml = buildLatDirXml();
    expect((xml.match(/<CAD>/g) ?? []).length).toBe(6);
    expect(xml).not.toContain("<Diameter>5.00</Diameter>");
    expect(xml).toContain("<Depth>30.00</Depth>");
    expect(xml).toContain("<Depth>13.00</Depth>");
  });

  it("face TypeNo=1 em L-T/2; aresta TypeNo=2 em X=0", () => {
    const xml = buildLatDirXml();
    expect(xml).toContain("<TypeNo>1</TypeNo>");
    expect(xml).toContain("<X1>532.00</X1>");
    expect(xml).toContain("<X1>0.00</X1>");
    expect(xml).toContain("<Y1>15.00</Y1>");
    expect(xml).toContain("<Y1>157.50</Y1>");
    expect(xml).toContain("<Y1>160.50</Y1>");
    expect(xml).toContain("<Depth>30.00</Depth>");
    expect(xml).toContain("<Quadrant>2</Quadrant>");
  });

  it("rasgos TypeNo=3 W-13 e W-23 com overcut L+10/−10 (LAT_ESQ.xml)", () => {
    const xml = buildLatDirXml();
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
