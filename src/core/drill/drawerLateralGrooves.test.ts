/**
 * Rasgos inferiores laterais — permanentes e independentes de L (LAT_ESQ.xml).
 */
import { describe, expect, it } from "vitest";
import {
  buildDrawerLateralBottomGrooves,
  computeDrawerLateralStructuralHoles,
} from "../drawers/drilling/DrawerDrillingRules";
import {
  DRAWER_LAT_GROOVE_BOTTOM_DEPTH_MM,
  DRAWER_LAT_GROOVE_BOTTOM_FROM_TOP_MM,
  DRAWER_LAT_GROOVE_BOTTOM_WIDTH_MM,
  DRAWER_LAT_GROOVE_CORRECTION,
  DRAWER_LAT_GROOVE_OVERCUT_MM,
  DRAWER_LAT_GROOVE_TOOL_NAME,
  DRAWER_LAT_GROOVE_TOP_DEPTH_MM,
  DRAWER_LAT_GROOVE_TOP_FROM_TOP_MM,
  DRAWER_LAT_GROOVE_TOP_WIDTH_MM,
} from "../drawers/drawerGeometryConstants";
import { buildDrillStationXmlFilesForProject } from "./drillExport";
import { buildPanelDrillingResult } from "../../modules/drilling/drillingAdapter";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { CutListItemComPreco } from "../types";
import { withIndustrialOutputAuthorization } from "../industrial/industrialOutputGuard";

function xmlFor(
  tipo: "gaveta_lat_esq" | "gaveta_lat_dir",
  L: number,
  W: number,
  T = 16
): string {
  return withIndustrialOutputAuthorization("all", () => {
    const drilling = buildPanelDrillingResult(
      { tipo, larguraMm: L, alturaMm: W, espessuraMm: T },
      defaultRulesConfig
    );
    expect(drilling.success).toBe(true);
    const item: CutListItemComPreco = {
      id: `${tipo}-${L}`,
      nome: tipo,
      tipo,
      quantidade: 1,
      dimensoes: { largura: L, altura: W, profundidade: T },
      espessura: T,
      material: "mdf",
      drillHoles: drilling.data!.drillHoles,
      precoUnitario: 0,
      precoTotal: 0,
    };
    return (
      buildDrillStationXmlFilesForProject([item], {
        projectName: "LAT_GROOVE",
        boxes: [],
        rules: defaultRulesConfig,
      })[0]?.xml ?? ""
    );
  });
}

describe("rasgos laterais gaveta — LAT_ESQ.xml permanente", () => {
  it("constantes industriais fixas", () => {
    expect(DRAWER_LAT_GROOVE_TOP_FROM_TOP_MM).toBe(13);
    expect(DRAWER_LAT_GROOVE_TOP_WIDTH_MM).toBe(13);
    expect(DRAWER_LAT_GROOVE_TOP_DEPTH_MM).toBe(3);
    expect(DRAWER_LAT_GROOVE_BOTTOM_FROM_TOP_MM).toBe(23);
    expect(DRAWER_LAT_GROOVE_BOTTOM_WIDTH_MM).toBe(11);
    expect(DRAWER_LAT_GROOVE_BOTTOM_DEPTH_MM).toBe(10);
    expect(DRAWER_LAT_GROOVE_OVERCUT_MM).toBe(10);
    expect(DRAWER_LAT_GROOVE_CORRECTION).toBe(2);
    expect(DRAWER_LAT_GROOVE_TOOL_NAME).toBe("FRESA_DESBASTE_10MM");
  });

  it("Y/Width/Depth iguais para L diferentes (só overcut muda)", () => {
    for (const L of [400, 540, 700]) {
      const grooves = buildDrawerLateralBottomGrooves(L, 195.5);
      expect(grooves).toHaveLength(2);
      expect(grooves.map((g) => [g.y, g.grooveWidth, g.profundidade])).toEqual([
        [195.5 - 13, 13, 3],
        [195.5 - 23, 11, 10],
      ]);
      expect(grooves.every((g) => g.grooveFullPanelOvercut === true)).toBe(true);
      expect(grooves.every((g) => g.grooveCorrection === 2)).toBe(true);
      expect(grooves.every((g) => g.grooveToolName === "FRESA_DESBASTE_10MM")).toBe(true);
      expect(grooves.every((g) => g.face === "frente")).toBe(true);
    }
  });

  it.each(["gaveta_lat_esq", "gaveta_lat_dir"] as const)(
    "%s XML: dois rasgos Exact LAT_ESQ (L=540 W=195.5)",
    (tipo) => {
      const xml = xmlFor(tipo, 540, 195.5);
      const blocks = xml.split("<CAD>").slice(1).filter((b) => b.includes("<TypeNo>3</TypeNo>"));
      expect(blocks).toHaveLength(2);

      expect(blocks[0]).toContain("<ToolName>FRESA_DESBASTE_10MM</ToolName>");
      expect(blocks[0]).toContain("<BeginX>550.00</BeginX>");
      expect(blocks[0]).toContain("<BeginY>182.50</BeginY>");
      expect(blocks[0]).toContain("<EndX>-10.00</EndX>");
      expect(blocks[0]).toContain("<EndY>182.50</EndY>");
      expect(blocks[0]).toContain("<Width>13.00</Width>");
      expect(blocks[0]).toContain("<Correction>2</Correction>");
      expect(blocks[0]).toContain("<Depth>3.00</Depth>");
      expect(blocks[0]).toContain("<Enable>1</Enable>");

      expect(blocks[1]).toContain("<ToolName>FRESA_DESBASTE_10MM</ToolName>");
      expect(blocks[1]).toContain("<BeginX>550.00</BeginX>");
      expect(blocks[1]).toContain("<BeginY>172.50</BeginY>");
      expect(blocks[1]).toContain("<EndX>-10.00</EndX>");
      expect(blocks[1]).toContain("<EndY>172.50</EndY>");
      expect(blocks[1]).toContain("<Width>11.00</Width>");
      expect(blocks[1]).toContain("<Correction>2</Correction>");
      expect(blocks[1]).toContain("<Depth>10.00</Depth>");
      expect(blocks[1]).toContain("<Enable>1</Enable>");
    }
  );

  it("esq e dir partilham os mesmos rasgos", () => {
    const esq = computeDrawerLateralStructuralHoles({
      largura: 500,
      altura: 180,
      espessura: 16,
      side: "esq",
    }).filter((h) => h.holeSubtype === "groove");
    const dir = computeDrawerLateralStructuralHoles({
      largura: 500,
      altura: 180,
      espessura: 16,
      side: "dir",
    }).filter((h) => h.holeSubtype === "groove");
    expect(esq.map((h) => [h.y, h.grooveWidth, h.profundidade])).toEqual(
      dir.map((h) => [h.y, h.grooveWidth, h.profundidade])
    );
  });
});
