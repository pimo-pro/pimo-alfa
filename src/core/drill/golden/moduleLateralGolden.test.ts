/**
 * Golden laterais de M×DULO — contrato + paridade de export.
 *
 * PROTECÇÃO: não importa DrawerDrillingRules / drawerDowelInterlock /
 * resolveGavetaLateralXmlHoles / gaveta_lat_*.
 */
import { describe, expect, it } from "vitest";
import {
  MODULE_LATERAL_GOLDEN_ESQ_PATH,
  MODULE_LATERAL_TIPOS,
  PROTECTED_DRAWER_LATERAL_TIPOS,
  assertModuleLateralGoldenContractShape,
  goldenHoleKey,
  loadModuleLateralGoldenFile,
  moduleLateralGoldenFileReady,
  parseModuleLateralGoldenXml,
} from "./moduleLateralGoldenContract";
import { isLateralPanel } from "../lateralDowels";
import { resolveXmlMachineTarget } from "../xmlMachineRouting";
import { buildModuleLateralEdgeCavilhaHoles } from "../moduleClassicCavilha";
import { buildDrillStationXmlFilesForProject } from "../drillExport";
import { defaultRulesConfig } from "../../rules/rulesConfig";
import type { CutListItemComPreco } from "../../types";

describe("golden module lateral — protecção de —mbito", () => {
  it("só lateral_esquerda / lateral_direita sóo alvo", () => {
    expect(MODULE_LATERAL_TIPOS).toEqual(["lateral_esquerda", "lateral_direita"]);
    expect(isLateralPanel({ tipo: "lateral_esquerda" } as never)).toBe(true);
    expect(isLateralPanel({ tipo: "gaveta_lat_esq" } as never)).toBe(false);
    expect(isLateralPanel({ tipo: "gaveta_lat_dir" } as never)).toBe(false);
  });

  it("laterais de gaveta permanecem DRILL e fora de isLateralPanel", () => {
    for (const tipo of PROTECTED_DRAWER_LATERAL_TIPOS) {
      expect(isLateralPanel({ tipo } as never)).toBe(false);
      expect(resolveXmlMachineTarget(tipo)).toBe("drill");
    }
  });
});

describe("golden module lateral — fixture MODULE_LATERAL_ESQ", () => {
  it("ficheiros golden presentes", () => {
    expect(moduleLateralGoldenFileReady(MODULE_LATERAL_GOLDEN_ESQ_PATH)).toBe(true);
  });

  it("contrato: L=862 W=351 T=15; 4— TypeNo2 —10 Depth=30 X?{0,L}", () => {
    const contract = loadModuleLateralGoldenFile(MODULE_LATERAL_GOLDEN_ESQ_PATH)!;
    expect(contract.panelLength).toBe(862);
    expect(contract.panelWidth).toBe(351);
    expect(contract.panelThickness).toBe(15);
    expect(contract.edgeCavilhas).toHaveLength(4);

    const shape = assertModuleLateralGoldenContractShape(contract);
    expect(shape.issues).toEqual([]);
    expect(shape.xOnEdges).toBe(true);
    expect(shape.allDepth30).toBe(true);

    expect(contract.edgeCavilhas.every((h) => Math.abs(h.z - 7.5) < 0.01)).toBe(true);

    const keys = new Set(contract.edgeCavilhas.map(goldenHoleKey));
    expect(keys).toEqual(
      new Set(["0.00_60.00_30.00_10.00", "0.00_291.00_30.00_10.00", "862.00_60.00_30.00_10.00", "862.00_291.00_30.00_10.00"])
    );
  });

  it("export sintético lateral_esquerda ? golden (L/W + 4 cavilhas)", () => {
    const golden = loadModuleLateralGoldenFile(MODULE_LATERAL_GOLDEN_ESQ_PATH)!;
    const L = golden.panelLength;
    const W = golden.panelWidth;
    const T = golden.panelThickness;

    const holes = buildModuleLateralEdgeCavilhaHoles({
      panelDepthMm: W,
      panelHeightMm: L,
      thicknessMm: T,
      side: "lateral_esquerda",
    });
    expect(holes).toHaveLength(4);

    const item: CutListItemComPreco = {
      id: "mod-lat-esq",
      nome: "MODULE_LATERAL_ESQ",
      tipo: "lateral_esquerda",
      quantidade: 1,
      dimensoes: { largura: W, altura: L, profundidade: T },
      espessura: T,
      material: "mdf",
      boxId: "b1",
      drillHoles: holes,
      precoUnitario: 0,
      precoTotal: 0,
      metadata: { qrCode: "MODULE_LATERAL_ESQ" },
    };

    const files = buildDrillStationXmlFilesForProject([item], {
      projectName: "GOLDEN_MOD",
      boxes: [],
      rules: defaultRulesConfig,
    });
    expect(files).toHaveLength(1);
    const exported = parseModuleLateralGoldenXml(files[0]!.xml);

    expect(exported.panelLength).toBe(golden.panelLength);
    expect(exported.panelWidth).toBe(golden.panelWidth);
    expect(exported.panelThickness).toBe(golden.panelThickness);
    expect(exported.edgeCavilhas).toHaveLength(4);

    const goldenKeys = [...golden.edgeCavilhas.map(goldenHoleKey)].sort();
    const exportKeys = [...exported.edgeCavilhas.map(goldenHoleKey)].sort();
    expect(exportKeys).toEqual(goldenKeys);

    for (const h of exported.edgeCavilhas) {
      expect(h.depth).toBe(30);
      expect([0, L]).toContain(h.x);
      expect([60, 291]).toContain(h.y);
      expect(h.z).toBeCloseTo(T / 2, 5);
    }
  });

  it("gaveta_lat_esq NÃO usa referencial L=altura do módulo", () => {
    const item: CutListItemComPreco = {
      id: "gav-lat",
      nome: "gav",
      tipo: "gaveta_lat_esq",
      quantidade: 1,
      dimensoes: { largura: 351, altura: 195.5, profundidade: 16 },
      espessura: 16,
      material: "mdf",
      boxId: "b1",
      drillHoles: [
        { x: 0, y: 15, diameter: 10, depth: 30, holeType: "cavilha", topDrillable: false },
        { x: 351, y: 160, diameter: 10, depth: 30, holeType: "cavilha", topDrillable: false },
      ],
      precoUnitario: 0,
      precoTotal: 0,
      metadata: { qrCode: "GAV_LAT_KEEP" },
    };
    const files = buildDrillStationXmlFilesForProject([item], {
      projectName: "KEEP_GAV",
      boxes: [],
      rules: defaultRulesConfig,
    });
    const xml = files[0]!.xml;
    // SSOT gaveta: L=largura (profundidade), W=altura — sem swap de módulo
    expect(xml).toContain("<PanelLength>351.00</PanelLength>");
    expect(xml).toContain("<PanelWidth>195.50</PanelWidth>");
    expect(xml).not.toContain("<PanelLength>195.50</PanelLength>");
  });
});
