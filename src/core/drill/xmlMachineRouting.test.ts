import { describe, expect, it } from "vitest";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { BoxModule, CutListItemComPreco, PanelDrillHole } from "../types";
import {
  buildCncXmlFilesForProject,
  buildDrillFilesForProject,
  buildDrillStationXmlFilesForProject,
  resolveXmlMachineTarget,
} from "./drillExport";
import { pieceShouldHaveDrillLabel } from "./xmlMachineRouting";

const project = {
  projectName: "TEST_PROJ",
  boxes: [
    {
      id: "box-1",
      nome: "C1",
      dimensoes: { largura: 600, altura: 720, profundidade: 560 },
      espessura: 19,
      tipoBorda: "reta",
      tipoFundo: "integrado",
      models: [],
      prateleiras: 0,
      portaTipo: "sem_porta",
      gavetas: 0,
      alturaGaveta: 0,
      doorsLayer: [],
      drawersLayer: [],
      cutList: [],
      cutListComPreco: [],
      ferragens: [],
      precoTotalPecas: 0,
      estrutura3D: null,
    },
  ] as BoxModule[],
  rules: defaultRulesConfig,
};

function item(
  tipo: string,
  dims: { largura: number; altura: number },
  holes: PanelDrillHole[],
  overrides: Partial<CutListItemComPreco> = {}
): CutListItemComPreco {
  return {
    id: tipo,
    nome: tipo,
    tipo,
    quantidade: 1,
    dimensoes: { ...dims, profundidade: 19 },
    espessura: 19,
    material: "mdf",
    boxId: "box-1",
    drillHoles: holes,
    precoUnitario: 0,
    precoTotal: 0,
    metadata: { qrCode: `C1_${tipo.toUpperCase()}-1` },
    ...overrides,
  };
}

const shelfHoles: PanelDrillHole[] = [
  { x: 60, y: 200, diameter: 5, depth: 13, holeType: "prateleira", topDrillable: true },
  { x: 291, y: 200, diameter: 5, depth: 13, holeType: "prateleira", topDrillable: true },
  { x: 60, y: 464, diameter: 5, depth: 13, holeType: "prateleira", topDrillable: true },
  { x: 291, y: 464, diameter: 5, depth: 13, holeType: "prateleira", topDrillable: true },
];

describe("xmlMachineRouting  CNC vs DRILL", () => {
  it("classifica tipos CNC e DRILL", () => {
    expect(resolveXmlMachineTarget("cima")).toBe("cnc");
    expect(resolveXmlMachineTarget("fundo")).toBe("cnc");
    expect(resolveXmlMachineTarget("COSTA")).toBe("cnc");
    expect(resolveXmlMachineTarget("gaveta_frente_int")).toBe("drill");
    expect(resolveXmlMachineTarget("gaveta_frente_ext")).toBe("drill");
    expect(resolveXmlMachineTarget("lateral_direita")).toBe("drill");
    expect(resolveXmlMachineTarget("lateral_esquerda")).toBe("drill");
    expect(resolveXmlMachineTarget("gaveta_lat_esq")).toBe("drill");
    expect(resolveXmlMachineTarget("gaveta_lat_dir")).toBe("drill");
    expect(resolveXmlMachineTarget("gaveta_traseira")).toBe("drill");
    expect(resolveXmlMachineTarget("divisorio")).toBe("drill");
    expect(resolveXmlMachineTarget("separador")).toBe("drill");
  });

  it("etiqueta DRILL s em peas da estao DRILL", () => {
    expect(
      pieceShouldHaveDrillLabel(item("cima", { largura: 600, altura: 560 }, shelfHoles))
    ).toBe(false);
    expect(
      pieceShouldHaveDrillLabel(item("fundo", { largura: 600, altura: 560 }, shelfHoles))
    ).toBe(false);
    expect(
      pieceShouldHaveDrillLabel(item("gaveta_frente_int", { largura: 500, altura: 150 }, shelfHoles))
    ).toBe(true);
    expect(
      pieceShouldHaveDrillLabel(
        item("lateral_direita", { largura: 351, altura: 862 }, shelfHoles)
      )
    ).toBe(true);
    expect(
      pieceShouldHaveDrillLabel(item("gaveta_lat_esq", { largura: 500, altura: 150 }, [
        { x: 0, y: 39, diameter: 10, depth: 14, holeType: "cavilha" },
      ]))
    ).toBe(true);
  });
});

describe("buildDrillFilesForProject — CNC / DRILL / COMPLETO", () => {
  it("gera CNC + DRILL + COMPLETO com caminhos correctos", () => {
    const items = [
      item("cima", { largura: 600, altura: 560 }, shelfHoles, {
        metadata: { qrCode: "C1_TOP-1" },
      }),
      item("lateral_direita", { largura: 351, altura: 862 }, shelfHoles, {
        metadata: { qrCode: "C1_LAT_DIR-89" },
      }),
      item("gaveta_lat_esq", { largura: 500, altura: 150 }, [
        { x: 0, y: 39, diameter: 10, depth: 14, holeType: "cavilha" },
        { x: 500, y: 39, diameter: 10, depth: 14, holeType: "cavilha" },
      ], { metadata: { qrCode: "C1_GAV_LAT_ESQ-1" } }),
      item("divisorio", { largura: 560, altura: 700 }, shelfHoles, {
        metadata: { qrCode: "C1_DIV-1" },
      }),
    ];

    const all = buildDrillFilesForProject(items, project);
    const cnc = buildCncXmlFilesForProject(items, project);
    const drill = buildDrillStationXmlFilesForProject(items, project);
    const completo = all.filter((f) => f.machineTarget === "completo");

    expect(cnc.map((f) => f.filenameBase)).toEqual(["C1_TOP-1"]);
    expect(cnc[0]!.zipPath).toBe("cnc/XML/C1_TOP-1.xml");
    expect(cnc[0]!.machineTarget).toBe("cnc");

    expect(drill.every((f) => f.machineTarget === "drill")).toBe(true);
    expect(drill.every((f) => f.filenameBase.endsWith("_DRILL"))).toBe(true);
    expect(drill.map((f) => f.zipPath).sort()).toEqual([
      "drill/XML/C1_DIV-1_DRILL.xml",
      "drill/XML/C1_GAV_LAT_ESQ-1_DRILL.xml",
      "drill/XML/C1_LAT_DIR-89_DRILL.xml",
    ]);
    // COMPLETO: todas as 4 peças (CNC + DRILL) em drill/XML
    expect(completo).toHaveLength(4);
    expect(completo.every((f) => f.filenameBase.endsWith("_COMPLETO"))).toBe(true);
    expect(completo.every((f) => f.zipPath.startsWith("drill/XML/"))).toBe(true);
    expect(completo.map((f) => f.filenameBase).sort()).toEqual([
      "C1_DIV-1_COMPLETO",
      "C1_GAV_LAT_ESQ-1_COMPLETO",
      "C1_LAT_DIR-89_COMPLETO",
      "C1_TOP-1_COMPLETO",
    ]);
    // 1 CNC + 3 DRILL + 4 COMPLETO
    expect(all).toHaveLength(8);
  });

  it("C1_LAT_DIR — Panel L×W = largura×altura SSOT; furos dentro da placa; X/Y = drillHoles", () => {
    const holes: PanelDrillHole[] = [
      { x: 60, y: 200, diameter: 5, depth: 13, holeType: "prateleira", topDrillable: true },
      { x: 291, y: 200, diameter: 5, depth: 13, holeType: "prateleira", topDrillable: true },
      { x: 60, y: 464, diameter: 5, depth: 13, holeType: "prateleira", topDrillable: true },
      { x: 291, y: 464, diameter: 5, depth: 13, holeType: "prateleira", topDrillable: true },
      // furo fora da placa (deve ser rejeitado)
      { x: 60, y: 999, diameter: 5, depth: 13, holeType: "prateleira", topDrillable: true },
    ];
    const lat = item("lateral_direita", { largura: 351, altura: 862 }, holes, {
      metadata: { qrCode: "C1_LAT_DIR-89" },
    });
    const files = buildDrillStationXmlFilesForProject([lat], project);
    expect(files).toHaveLength(1);
    const xml = files[0]!.xml;
    expect(xml).toContain("<PanelLength>351.00</PanelLength>");
    expect(xml).toContain("<PanelWidth>862.00</PanelWidth>");
    expect(xml).toContain("<X1>60.00</X1>");
    expect(xml).toContain("<X1>291.00</X1>");
    expect(xml).toContain("<Y1>200.00</Y1>");
    expect(xml).toContain("<Y1>464.00</Y1>");
    expect(xml).not.toContain("<Y1>999.00</Y1>");
    // Sem o swap antigo (L=altura) que gerava furos fora da placa
    expect(xml).not.toContain("<PanelLength>862.00</PanelLength>");
  });

  it("gaveta DRILL  sem Diameter 5.00; s cavilhas", () => {
    const lat = item(
      "gaveta_lat_dir",
      { largura: 500, altura: 150 },
      [
        { x: 0, y: 39, diameter: 10, depth: 14, holeType: "cavilha" },
        { x: 500, y: 111, diameter: 10, depth: 14, holeType: "cavilha" },
      ],
      { metadata: { qrCode: "C1_GAV_LAT_DIR-1" } }
    );
    const files = buildDrillStationXmlFilesForProject([lat], project);
    expect(files[0]!.xml).not.toContain("<Diameter>5.00</Diameter>");
    expect(files[0]!.xml).toContain("<Diameter>10.00</Diameter>");
    expect(files[0]!.filenameBase).toBe("C1_GAV_LAT_DIR-1_DRILL");
  });
});
