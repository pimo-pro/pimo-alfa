/**
 * gav_lat_esq / gav_lat_dir — sem swap X?Y no nesting CNC nem no XML DRILL.
 */
import { describe, expect, it } from "vitest";
import { cutlistToPieces } from "../cutlayout/cutLayoutEngine";
import { buildDrillStationXmlFilesForProject } from "./drillExport";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { CutListItemComPreco, PanelDrillHole } from "../types";

const HOLES: PanelDrillHole[] = [
  { x: 0, y: 30, diameter: 10, depth: 14, holeType: "cavilha" },
  { x: 0, y: 120, diameter: 10, depth: 14, holeType: "cavilha" },
  { x: 250, y: 39, diameter: 10, depth: 14, holeType: "cavilha" },
  { x: 250, y: 111, diameter: 10, depth: 14, holeType: "cavilha" },
];

/** Caso crítico: altura > largura — antes activava dimensionsSwapped e invertia furos. */
function tallGavLat(tipo: "gaveta_lat_esq" | "gaveta_lat_dir"): CutListItemComPreco {
  return {
    id: tipo,
    nome: tipo,
    tipo,
    quantidade: 1,
    dimensoes: { largura: 250, altura: 400, profundidade: 16 },
    espessura: 16,
    material: "mdf",
    boxId: "b1",
    drillHoles: HOLES,
    precoUnitario: 0,
    precoTotal: 0,
    metadata: { qrCode: `${tipo}-1` },
  };
}

describe("gav_lat — sem swap X?Y (CNC nesting + XML DRILL)", () => {
  it.each(["gaveta_lat_esq", "gaveta_lat_dir"] as const)(
    "%s cutlistToPieces preserva X/Y SSOT mesmo com altura > largura",
    (tipo) => {
      const pieces = cutlistToPieces([tallGavLat(tipo)]);
      expect(pieces).toHaveLength(1);
      expect(pieces[0]!.largura_mm).toBe(250);
      expect(pieces[0]!.altura_mm).toBe(400);
      const xs = (pieces[0]!.drillHoles ?? []).map((h) => h.x).sort((a, b) => a - b);
      const ys = (pieces[0]!.drillHoles ?? []).map((h) => h.y).sort((a, b) => a - b);
      // Sem transform (x,y)?(y, L?x)
      expect(xs).toEqual([0, 0, 250, 250]);
      expect(ys).toEqual([30, 39, 111, 120]);
    }
  );

  it("XML DRILL: L=largura W=altura; X1/Y1 = drillHoles sem remap", () => {
    const item = tallGavLat("gaveta_lat_dir");
    const files = buildDrillStationXmlFilesForProject([item], {
      projectName: "T",
      boxes: [],
      rules: defaultRulesConfig,
    });
    expect(files).toHaveLength(1);
    const xml = files[0]!.xml;
    expect(xml).toContain("<PanelLength>250.00</PanelLength>");
    expect(xml).toContain("<PanelWidth>400.00</PanelWidth>");
    expect(xml).toContain("<X1>0.00</X1>");
    expect(xml).toContain("<X1>250.00</X1>");
    expect(xml).toContain("<Y1>30.00</Y1>");
    expect(xml).toContain("<Y1>39.00</Y1>");
    expect(xml).toContain("<Y1>111.00</Y1>");
    expect(xml).toContain("<Y1>120.00</Y1>");
    // Não deve ter o remap antigo Y?X (ex.: X1=30 com painel L=250)
    expect(xml).not.toContain("<X1>30.00</X1>");
  });

  it("outras peças (módulo lateral) ainda podem usar sort/swap — não regressão", () => {
    const mod: CutListItemComPreco = {
      id: "mod",
      nome: "lat",
      tipo: "lateral_direita",
      quantidade: 1,
      dimensoes: { largura: 300, altura: 800, profundidade: 19 },
      espessura: 19,
      material: "mdf",
      boxId: "b1",
      drillHoles: [{ x: 60, y: 200, diameter: 5, depth: 13, holeType: "prateleira", topDrillable: true }],
      precoUnitario: 0,
      precoTotal: 0,
    };
    const pieces = cutlistToPieces([mod]);
    // Module lateral com L<A: sort + swap de furos mantém-se
    expect(pieces[0]!.largura_mm).toBe(800);
    expect(pieces[0]!.altura_mm).toBe(300);
    expect(pieces[0]!.drillHoles?.[0]?.x).toBe(200);
    expect(pieces[0]!.drillHoles?.[0]?.y).toBe(300 - 60);
  });
});
