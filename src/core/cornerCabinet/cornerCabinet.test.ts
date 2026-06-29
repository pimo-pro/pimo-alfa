import { describe, expect, it } from "vitest";
import { settingsDefaults } from "../settings/settingsSchema";
import {
  computeCornerLayoutMm,
  getCornerCabinetConfig,
  CORNER_DIREITA_INFERIOR_V2_ID,
  CORNER_FF_COZINHA_INFERIOR_ID,
  isCornerLayoutSsotModel,
  CORNER_FIXED_FRONT_OVERSIZE_MM,
  resolveCornerDoorGapSettings,
} from "./cornerCabinetRules";
import { computeCornerVisualLayout } from "./cornerCabinetVisual";
import {
  buildCornerFixedFrontDowelHoles,
  countCornerFixedFrontFaceDowelConnections,
  CORNER_FF_EDGE_DOWEL_DEPTH_MM,
  CORNER_FF_FACE_DOWEL_DEPTH_MM,
  dedupePanelDrillHoles,
  resolveFrenteFixaLateralHoleYFromTop,
} from "./cornerFixedFrontDowels";
import { buildCornerDoorLayerItems, syncCornerWorkspaceBoxDoorsLayer } from "./cornerCabinetLayers";
import { migrateCornerDireitaInferiorBoxToV2 } from "./cornerCabinetMigration";
import { gerarPaineisCorner } from "./cornerCabinetManufacturing";
import { createWorkspaceBox } from "../../context/projectState";
import { cutlistComPrecoFromBox } from "../manufacturing/cutlistFromBoxes";
import { buildDrillFilesForProject } from "../drill/drillExport";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { BoxModule, CutListItemComPreco, WorkspaceBox } from "../types";
import type { DoorLayerItem } from "../../models/BoxLayers";

describe("cornerCabinet — Canto Direita Inferior v2", () => {
  const cfg = getCornerCabinetConfig(CORNER_DIREITA_INFERIOR_V2_ID)!;
  const gaps = settingsDefaults.portas;

  it("frente fixa = porta esquerda + 2 mm (largura e altura), sem folgas de porta", () => {
    const layout = computeCornerLayoutMm({
      boxWidthMm: 900,
      boxHeightMm: 720,
      boxDepthMm: 600,
      thicknessMm: 19,
      side: "right",
      config: cfg,
      gapVerticalMm: gaps.portaGapVerticalMm,
      gapHorizontalMm: gaps.portaGapHorizontalMm,
      doorFixedGapMm: gaps.portaGapDuplaMm,
    });

    expect(layout.leftDoorWidthMm).toBe(180);
    expect(layout.leftDoorHeightMm).toBe(layout.doorHeightMm);
    expect(layout.fixedFrontWidthMm).toBe(layout.leftDoorWidthMm + CORNER_FIXED_FRONT_OVERSIZE_MM);
    expect(layout.fixedFrontHeightMm).toBe(layout.leftDoorHeightMm + CORNER_FIXED_FRONT_OVERSIZE_MM);
    expect(layout.fixedFrontWidthMm).toBe(182);
    expect(layout.fixedFrontHeightMm).toBe(720);
    expect(layout.door.hingeSide).toBe("right");
    expect(layout.fixedFront.posX).toBeLessThan(0);
    expect(layout.door.centerX).toBeGreaterThan(0);
  });

  it("exemplo genérico: porta esquerda 500×1000 → frente fixa 502×1002", () => {
    const layout = computeCornerLayoutMm({
      boxWidthMm: 2000,
      boxHeightMm: 1000,
      boxDepthMm: 600,
      thicknessMm: 19,
      side: "right",
      config: { ...cfg, fixedFrontWidthMm: 500 },
      gapVerticalMm: 0,
      gapHorizontalMm: 0,
      doorFixedGapMm: 0,
    });

    expect(layout.leftDoorWidthMm).toBe(500);
    expect(layout.leftDoorHeightMm).toBe(1000);
    expect(layout.fixedFrontWidthMm).toBe(502);
    expect(layout.fixedFrontHeightMm).toBe(1002);
  });

  it("syncCornerWorkspaceBoxDoorsLayer corrige doorsLayer legado com 2 portas", () => {
    const legacy: WorkspaceBox = {
      id: "box-legacy",
      nome: "Canto",
      dimensoes: { largura: 900, altura: 720, profundidade: 600 },
      espessura: 19,
      tipoBorda: "reta",
      tipoFundo: "recuado",
      models: [],
      prateleiras: 2,
      portaTipo: "porta_simples",
      gavetas: 0,
      alturaGaveta: 200,
      posicaoX_mm: 0,
      posicaoY_mm: 460,
      posicaoZ_mm: 0,
      rotacaoY_90: false,
      rotacaoY: 0,
      manualPosition: false,
      baseCabinetId: CORNER_DIREITA_INFERIOR_V2_ID,
      doorsLayer: [
        {
          id: "door-left",
          parentBoxId: "box-legacy",
          groupType: "dupla",
          width: 448,
          height: 718,
          thickness: 19,
          materialId: "mdf_branco",
          material: "mdf_branco",
          openDirection: "left",
          isOpen: false,
          hingeSide: "left",
          pivot: "left-edge",
          posX: -449,
          posY: 0,
          posZ: 300,
          rotY: 0,
        },
        {
          id: "door-right",
          parentBoxId: "box-legacy",
          groupType: "dupla",
          width: 448,
          height: 718,
          thickness: 19,
          materialId: "mdf_branco",
          material: "mdf_branco",
          openDirection: "right",
          isOpen: false,
          hingeSide: "right",
          pivot: "right-edge",
          posX: 449,
          posY: 0,
          posZ: 300,
          rotY: 0,
        },
      ],
      drawersLayer: [],
      locked: false,
      costaAtiva: true,
      profundidadeExterna: 600,
      remateIds: [],
    };
    const synced = syncCornerWorkspaceBoxDoorsLayer(legacy);
    expect(synced.doorsLayer).toHaveLength(1);
    expect(synced.doorsLayer[0]?.hingeSide).toBe("right");
    expect(synced.doorsLayer[0]?.width).toBe(716);
  });

  it("createWorkspaceBox gera 1 porta corner quando baseCabinetId está definido antes das layers", () => {
    const box = createWorkspaceBox(
      "box-canto-new",
      "Canto — Direita (Inferior)",
      { largura: 900, altura: 720, profundidade: 600 },
      19,
      0,
      [],
      "reta",
      "recuado",
      CORNER_DIREITA_INFERIOR_V2_ID,
      {
        baseCabinetId: CORNER_DIREITA_INFERIOR_V2_ID,
        portaTipo: "porta_simples",
        prateleiras: 2,
        cornerFixedFront: true,
        cabinetType: "lower",
      }
    );

    expect(box.baseCabinetId).toBe(CORNER_DIREITA_INFERIOR_V2_ID);
    expect(box.doorsLayer).toHaveLength(1);
    expect(box.doorsLayer[0]?.hingeSide).toBe("right");
    expect(box.doorsLayer[0]?.width).toBe(716);
    expect(box.doorsLayer[0]?.height).toBe(718);
  });

  it("manufacturing gera frente_fixa 182×720 e uma única porta direita (sem porta esquerda)", () => {
    const box: BoxModule = {
      id: "box-canto-test",
      baseCabinetId: CORNER_DIREITA_INFERIOR_V2_ID,
      dimensoes: { largura: 900, altura: 720, profundidade: 600 },
      espessura: 19,
      portaTipo: "porta_simples",
      prateleiras: 2,
      gavetas: 0,
      material: "mdf_branco",
    };
    const paineis = gerarPaineisCorner(box, defaultRulesConfig);
    const ff = paineis.find((p) => p.tipo === "frente_fixa");
    const portas = paineis.filter((p) => p.tipo === "porta_simples" || p.tipo === "porta_dupla");
    expect(ff?.largura_mm).toBe(182);
    expect(ff?.altura_mm).toBe(720);
    expect(portas).toHaveLength(1);
    expect(portas[0]?.largura_mm).toBe(716);
    expect(portas[0]?.altura_mm).toBe(718);
  });

  it("cutlist usa frente fixa do layout mesmo com doorsLayer legado de porta dupla", () => {
    const box: BoxModule = {
      id: "box-canto-legacy-doors",
      baseCabinetId: CORNER_DIREITA_INFERIOR_V2_ID,
      dimensoes: { largura: 900, altura: 720, profundidade: 600 },
      espessura: 19,
      portaTipo: "porta_simples",
      prateleiras: 2,
      gavetas: 0,
      material: "mdf_branco",
      doorsLayer: [
        {
          id: "door-left-stale",
          parentBoxId: "box-canto-legacy-doors",
          groupType: "dupla",
          width: 448,
          height: 718,
          thickness: 19,
          materialId: "mdf_branco",
          material: "mdf_branco",
          openDirection: "left",
          isOpen: false,
          hingeSide: "left",
          pivot: "left-edge",
          posX: -449,
          posY: 0,
          posZ: 300,
          rotY: 0,
        },
        {
          id: "door-right-stale",
          parentBoxId: "box-canto-legacy-doors",
          groupType: "dupla",
          width: 448,
          height: 718,
          thickness: 19,
          materialId: "mdf_branco",
          material: "mdf_branco",
          openDirection: "right",
          isOpen: false,
          hingeSide: "right",
          pivot: "right-edge",
          posX: 449,
          posY: 0,
          posZ: 300,
          rotY: 0,
        },
      ],
    };
    const items = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const ff = items.find((i) => i.tipo === "frente_fixa");
    const portas = items.filter((i) => i.tipo === "porta_simples" || i.tipo === "porta_dupla");
    expect(ff?.dimensoes?.largura).toBe(182);
    expect(ff?.dimensoes?.altura).toBe(720);
    expect(portas).toHaveLength(1);
    expect(portas[0]?.dimensoes?.largura).toBe(716);
  });

  it("buildCornerDoorLayerItems devolve só a porta direita a partir do layout", () => {
    const doors = buildCornerDoorLayerItems(
      {
        id: "box-canto",
        baseCabinetId: CORNER_DIREITA_INFERIOR_V2_ID,
        rotacaoY: 0,
        dimensoes: { largura: 900, altura: 720, profundidade: 600 },
        espessura: 19,
        portaTipo: "porta_simples",
      },
      [
        {
          id: "door-left-stale",
          parentBoxId: "box-canto",
          groupType: "dupla",
          width: 448,
          height: 718,
          thickness: 19,
          materialId: "mdf_branco",
          material: "mdf_branco",
          openDirection: "left",
          isOpen: false,
          hingeSide: "left",
          pivot: "left-edge",
          posX: -449,
          posY: 0,
          posZ: 300,
          rotY: 0,
        },
      ]
    );
    expect(doors).toHaveLength(1);
    expect(doors[0]?.hingeSide).toBe("right");
    expect(doors[0]?.width).toBe(716);
    expect(doors[0]?.height).toBe(718);
    expect(doors[0]?.posX).toBeGreaterThan(0);
  });

  it("resolveCornerDoorGapSettings usa portas do schema (folga dinâmica)", () => {
    const resolved = resolveCornerDoorGapSettings(settingsDefaults);
    expect(resolved.gapVerticalMm).toBe(gaps.portaGapVerticalMm);
    expect(resolved.gapHorizontalMm).toBe(gaps.portaGapHorizontalMm);
    expect(resolved.doorFixedGapMm).toBe(gaps.portaGapDuplaMm);
  });

  it("gera furos de cavilha: cima/fundo/lateral esq + 6 ligações na frente fixa", () => {
    const ffW = 182;
    const ffH = 720;
    const latH = 682;
    const holes = buildCornerFixedFrontDowelHoles(
      {
        fixedFrontWidthMm: ffW,
        fixedFrontHeightMm: ffH,
        panelWidthMm: 900,
        fixedFrontSide: "left",
      },
      latH
    );

    expect(holes.cima).toHaveLength(2);
    expect(holes.fundo).toHaveLength(2);
    expect(holes.lateral_esquerda).toHaveLength(2);
    expect(countCornerFixedFrontFaceDowelConnections()).toBe(6);
    expect(holes.frente_fixa.length).toBeGreaterThanOrEqual(4);
    expect(holes.frente_fixa.length).toBeLessThanOrEqual(6);

    for (const h of [...holes.cima, ...holes.fundo, ...(holes.lateral_esquerda ?? [])]) {
      expect(h.diameter).toBe(10);
      expect(h.depth).toBe(CORNER_FF_EDGE_DOWEL_DEPTH_MM);
      expect(h.topDrillable).toBe(false);
    }

    for (const h of holes.frente_fixa) {
      expect(h.diameter).toBe(10);
      expect(h.depth).toBe(CORNER_FF_FACE_DOWEL_DEPTH_MM);
      expect(h.topDrillable).toBe(true);
    }

    expect(holes.cima[0]?.x).toBe(60);
    expect(holes.cima[1]?.x).toBe(ffW - 60);
    expect(holes.lateral_esquerda?.[0]?.y).toBe(latH - 60);
    expect(holes.lateral_esquerda?.[1]?.y).toBe(60);
  });

  it("alinha furos laterais da frente fixa com a altura da lateral", () => {
    const y = resolveFrenteFixaLateralHoleYFromTop(720, 682, 60);
    expect(y.topY).toBe(79);
    expect(y.bottomY).toBe(641);
  });

  it("espelha furos na lateral direita e cima/fundo quando FF está à direita", () => {
    const ffW = 182;
    const holes = buildCornerFixedFrontDowelHoles(
      {
        fixedFrontWidthMm: ffW,
        fixedFrontHeightMm: 720,
        panelWidthMm: 900,
        fixedFrontSide: "right",
      },
      682
    );

    expect(holes.lateral_esquerda).toBeUndefined();
    expect(holes.lateral_direita).toHaveLength(2);
    expect(holes.cima[0]?.x).toBe(900 - ffW + 60);
    expect(holes.cima[1]?.x).toBe(840);
  });

  it("dedupePanelDrillHoles remove coordenadas duplicadas", () => {
    const merged = dedupePanelDrillHoles([
      { x: 60, y: 60, diameter: 10, depth: 13, topDrillable: true },
      { x: 60, y: 60, diameter: 10, depth: 13, topDrillable: true },
      { x: 120, y: 60, diameter: 10, depth: 13, topDrillable: true },
    ]);
    expect(merged).toHaveLength(2);
  });

  it("modelo legacy (superior) mantém layout original intacto", () => {
    const legacyCfg = getCornerCabinetConfig("corner-ff-cozinha-superior")!;
    expect(legacyCfg.layoutMode).toBeUndefined();
    const layout = computeCornerLayoutMm({
      boxWidthMm: 900,
      boxHeightMm: 720,
      boxDepthMm: 350,
      thicknessMm: 19,
      side: "right",
      config: legacyCfg,
      gapVerticalMm: 1,
      gapHorizontalMm: 1,
      doorFixedGapMm: 2,
    });
    expect(layout.fixedFrontWidthMm).toBe(180);
    expect(layout.fixedFrontHeightMm).toBe(layout.doorHeightMm);
    expect(layout.fixedFront.posX).toBeGreaterThan(0);
    expect(layout.door.centerX).toBeLessThan(0);
  });
});

describe("cornerCabinet — Canto Direita Inferior v2 (SSOT industrial)", () => {
  const v2Cfg = getCornerCabinetConfig(CORNER_DIREITA_INFERIOR_V2_ID)!;
  const gaps = settingsDefaults.portas;

  const legacyTwoDoors: DoorLayerItem[] = [
    {
      id: "door-left-stale",
      parentBoxId: "box-v2",
      groupType: "dupla",
      width: 448,
      height: 718,
      thickness: 19,
      materialId: "mdf_branco",
      material: "mdf_branco",
      openDirection: "left",
      isOpen: false,
      hingeSide: "left",
      pivot: "left-edge",
      posX: -449,
      posY: 0,
      posZ: 300,
      rotY: 0,
    },
    {
      id: "door-right-stale",
      parentBoxId: "box-v2",
      groupType: "dupla",
      width: 448,
      height: 718,
      thickness: 19,
      materialId: "mdf_branco",
      material: "mdf_branco",
      openDirection: "right",
      isOpen: false,
      hingeSide: "right",
      pivot: "right-edge",
      posX: 449,
      posY: 0,
      posZ: 300,
      rotY: 0,
    },
  ];

  it("é modelo SSOT e tem layoutMode direita", () => {
    expect(isCornerLayoutSsotModel(CORNER_DIREITA_INFERIOR_V2_ID)).toBe(true);
    expect(v2Cfg.layoutMode).toBe("direita");
  });

  it("migrateCornerDireitaInferiorBoxToV2 converte corner-ff-cozinha-inferior legado", () => {
    const legacy: WorkspaceBox = {
      id: "box-legacy-mig",
      nome: "Canto — Direita (Inferior) [legado]",
      dimensoes: { largura: 900, altura: 720, profundidade: 600 },
      espessura: 19,
      tipoBorda: "reta",
      tipoFundo: "recuado",
      models: [],
      prateleiras: 2,
      portaTipo: "porta_simples",
      gavetas: 0,
      alturaGaveta: 200,
      posicaoX_mm: 0,
      posicaoY_mm: 460,
      posicaoZ_mm: 0,
      rotacaoY_90: false,
      rotacaoY: 0,
      manualPosition: false,
      baseCabinetId: CORNER_FF_COZINHA_INFERIOR_ID,
      catalogItemId: CORNER_FF_COZINHA_INFERIOR_ID,
      doorsLayer: legacyTwoDoors,
      drawersLayer: [],
      divisores: [],
      separadores: [],
      locked: false,
      costaAtiva: true,
      profundidadeExterna: 600,
      remateIds: [],
    };
    const migrated = migrateCornerDireitaInferiorBoxToV2(legacy);
    expect(migrated.baseCabinetId).toBe(CORNER_DIREITA_INFERIOR_V2_ID);
    expect(migrated.catalogItemId).toBe(CORNER_DIREITA_INFERIOR_V2_ID);
    expect(migrated.doorsLayer).toHaveLength(1);
    expect(migrated.doorsLayer[0]?.hingeSide).toBe("right");
  });

  it("createWorkspaceBox v2 nasce com 1 porta direita e frente_fixa no panelIds", () => {
    const box = createWorkspaceBox(
      "box-v2-new",
      "Canto — Direita (Inferior)",
      { largura: 900, altura: 720, profundidade: 600 },
      19,
      0,
      [],
      "reta",
      "recuado",
      CORNER_DIREITA_INFERIOR_V2_ID,
      {
        baseCabinetId: CORNER_DIREITA_INFERIOR_V2_ID,
        portaTipo: "porta_simples",
        prateleiras: 2,
        cornerFixedFront: true,
        cabinetType: "lower",
      }
    );
    expect(box.baseCabinetId).toBe(CORNER_DIREITA_INFERIOR_V2_ID);
    expect(box.panelIds?.frente_fixa).toBeTruthy();
    expect(box.doorsLayer).toHaveLength(1);
    expect(box.doorsLayer[0]?.hingeSide).toBe("right");
    expect(box.doorsLayer[0]?.width).toBe(716);
  });

  it("buildCornerDoorLayerItems v2 ignora doorsLayer legado (2 portas)", () => {
    const doors = buildCornerDoorLayerItems(
      {
        id: "box-v2",
        baseCabinetId: CORNER_DIREITA_INFERIOR_V2_ID,
        rotacaoY: 0,
        dimensoes: { largura: 900, altura: 720, profundidade: 600 },
        espessura: 19,
        portaTipo: "porta_simples",
      },
      legacyTwoDoors
    );
    expect(doors).toHaveLength(1);
    expect(doors[0]?.hingeSide).toBe("right");
    expect(doors[0]?.width).toBe(716);
    expect(doors[0]?.height).toBe(718);
  });

  it("manufacturing v2: frente_fixa 182×720 + 1 porta", () => {
    const box: BoxModule = {
      id: "box-v2-mfg",
      baseCabinetId: CORNER_DIREITA_INFERIOR_V2_ID,
      dimensoes: { largura: 900, altura: 720, profundidade: 600 },
      espessura: 19,
      portaTipo: "porta_simples",
      prateleiras: 2,
      gavetas: 0,
      material: "mdf_branco",
      doorsLayer: legacyTwoDoors,
    };
    const paineis = gerarPaineisCorner(box, defaultRulesConfig);
    const ff = paineis.find((p) => p.tipo === "frente_fixa");
    const portas = paineis.filter((p) => p.tipo === "porta_simples");
    expect(ff?.largura_mm).toBe(182);
    expect(ff?.altura_mm).toBe(720);
    expect(portas).toHaveLength(1);
  });

  it("cutlist v2 ignora doorsLayer legado e aplica cavilhas", () => {
    const box: BoxModule = {
      id: "box-v2-cut",
      baseCabinetId: CORNER_DIREITA_INFERIOR_V2_ID,
      dimensoes: { largura: 900, altura: 720, profundidade: 600 },
      espessura: 19,
      portaTipo: "porta_simples",
      prateleiras: 2,
      gavetas: 0,
      material: "mdf_branco",
      doorsLayer: legacyTwoDoors,
    };
    const items = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const ff = items.find((i) => i.tipo === "frente_fixa");
    const portas = items.filter((i) => i.tipo === "porta_simples" || i.tipo === "porta_dupla");
    const latEsq = items.find((i) => i.tipo === "lateral_esquerda");
    expect(ff?.dimensoes?.largura).toBe(182);
    expect(ff?.dimensoes?.altura).toBe(720);
    expect(portas).toHaveLength(1);
    expect(latEsq?.drillHoles?.some((h) => h.holeType === "dobradica")).toBe(false);
    expect(ff?.drillHoles?.length).toBeGreaterThan(0);
  });

  it("visual v2: frente fixa 182×720 mm no viewer", () => {
    const visual = computeCornerVisualLayout({
      widthM: 0.9,
      heightM: 0.72,
      depthM: 0.6,
      thicknessM: 0.019,
      side: "right",
      config: v2Cfg,
      gapVerticalMm: gaps.portaGapVerticalMm,
      gapHorizontalMm: gaps.portaGapHorizontalMm,
      doorFixedGapMm: gaps.portaGapDuplaMm,
    });
    expect(visual.fixedFront.size[0]).toBeCloseTo(0.182, 3);
    expect(visual.fixedFront.size[1]).toBeCloseTo(0.72, 3);
    expect(visual.fixedFront.pos[0]).toBeLessThan(0);
  });

  it("layout v2: frente fixa = porta esquerda + 2 mm", () => {
    const layout = computeCornerLayoutMm({
      boxWidthMm: 900,
      boxHeightMm: 720,
      boxDepthMm: 600,
      thicknessMm: 19,
      side: "right",
      config: v2Cfg,
      gapVerticalMm: gaps.portaGapVerticalMm,
      gapHorizontalMm: gaps.portaGapHorizontalMm,
      doorFixedGapMm: gaps.portaGapDuplaMm,
    });
    expect(layout.fixedFrontWidthMm).toBe(182);
    expect(layout.fixedFrontHeightMm).toBe(720);
  });
});

describe("cornerCabinet — exportação TXML industrial", () => {
  const project = {
    projectName: "TESTE_CANTO",
    boxes: [],
    rules: defaultRulesConfig,
  };

  function item(
    tipo: string,
    drillHoles: CutListItemComPreco["drillHoles"],
    dims: { largura: number; altura: number }
  ): CutListItemComPreco {
    return {
      id: `${tipo}-1`,
      nome: tipo,
      tipo,
      quantidade: 1,
      dimensoes: { ...dims, profundidade: 19 },
      espessura: 19,
      material: "mdf_branco",
      boxId: "box-canto",
      precoUnitario: 0,
      precoTotal: 0,
      drillHoles,
    };
  }

  it("exporta TXML para lateral esquerda, cima, fundo e frente fixa com furos", () => {
    const edgeHole = {
      x: 60,
      y: 60,
      diameter: 10,
      depth: 30,
      holeType: "cavilha" as const,
      topDrillable: false,
      face: "B" as const,
    };
    const faceHole = {
      x: 60,
      y: 60,
      diameter: 10,
      depth: 13,
      holeType: "cavilha" as const,
      topDrillable: true,
      face: "B" as const,
    };
    const items = [
      item("lateral_esquerda", [edgeHole, { ...edgeHole, y: 622 }], { largura: 560, altura: 682 }),
      item("cima", [edgeHole, { ...edgeHole, x: 122 }], { largura: 900, altura: 560 }),
      item("fundo", [edgeHole, { ...edgeHole, x: 122 }], { largura: 900, altura: 560 }),
      item("frente_fixa", [faceHole, { ...faceHole, x: 122 }], { largura: 182, altura: 720 }),
    ];
    const files = buildDrillFilesForProject(items, project);
    expect(files.length).toBe(4);
    for (const f of files) {
      expect(f.xml).toContain("KDTPanelFormat");
      expect(f.xml).toContain("Diameter>10.00");
    }
  });
});
