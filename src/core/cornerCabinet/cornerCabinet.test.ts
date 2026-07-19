import { describe, expect, it } from "vitest";
import { settingsDefaults } from "../settings/settingsSchema";
import {
  computeCornerLayoutMm,
  getCornerCabinetConfig,
  CORNER_DIREITA_INFERIOR_V2_ID,
  CORNER_FF_COZINHA_INFERIOR_ID,
  isCornerLayoutSsotModel,
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
import {
  buildCornerFixedFrontHingeHoles,
  CORNER_FF_HINGE_DEPTH_FROM_FRONT_MM,
} from "./cornerFixedFrontHinges";
import { mirrorDoorHingeHolesX } from "./doorHingeBuilder";
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

  it("frente fixa segue metade esquerda de porta dupla (+folga topo); porta direita = metade direita", () => {
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

    expect(layout.leftDoorWidthMm).toBe(447);
    expect(layout.leftDoorHeightMm).toBe(716);
    expect(layout.doorWidthMm).toBe(447);
    expect(layout.doorHeightMm).toBe(716);
    expect(layout.fixedFrontWidthMm).toBe(447);
    expect(layout.fixedFrontHeightMm).toBe(720);
    expect(layout.door.hingeSide).toBe("left");
    expect(layout.fixedFront.posX).toBeLessThan(0);
    expect(layout.door.centerX).toBeGreaterThan(0);
    expect(layout.fixedFront.posY).toBe(0);
  });

  it("exemplo 800×900×500: porta direita 397×896, frente fixa 397×900", () => {
    const layout = computeCornerLayoutMm({
      boxWidthMm: 800,
      boxHeightMm: 900,
      boxDepthMm: 500,
      thicknessMm: 19,
      side: "right",
      config: cfg,
      gapVerticalMm: gaps.portaGapVerticalMm,
      gapHorizontalMm: gaps.portaGapHorizontalMm,
      doorFixedGapMm: gaps.portaGapDuplaMm,
    });

    expect(layout.doorWidthMm).toBe(397);
    expect(layout.doorHeightMm).toBe(896);
    expect(layout.fixedFrontWidthMm).toBe(397);
    expect(layout.fixedFrontHeightMm).toBe(900);
    expect(layout.leftDoorWidthMm).toBe(397);
    expect(layout.fixedFront.posY).toBe(0);
    expect(layout.fixedFront.posX).toBe(-199.5);
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
    expect(synced.doorsLayer[0]?.hingeSide).toBe("left");
    expect(synced.doorsLayer[0]?.width).toBe(447);
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
    expect(box.doorsLayer[0]?.hingeSide).toBe("left");
    expect(box.doorsLayer[0]?.width).toBe(447);
    expect(box.doorsLayer[0]?.height).toBe(716);
  });

  it("manufacturing gera frente_fixa 447×720 e uma única porta direita (sem porta esquerda)", () => {
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
    expect(ff?.largura_mm).toBe(447);
    expect(ff?.altura_mm).toBe(720);
    expect(portas).toHaveLength(1);
    expect(portas[0]?.largura_mm).toBe(447);
    expect(portas[0]?.altura_mm).toBe(716);
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
    expect(ff?.dimensoes?.largura).toBe(447);
    expect(ff?.dimensoes?.altura).toBe(720);
    expect(portas).toHaveLength(1);
    expect(portas[0]?.dimensoes?.largura).toBe(447);
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
    expect(doors[0]?.hingeSide).toBe("left");
    expect(doors[0]?.width).toBe(447);
    expect(doors[0]?.height).toBe(716);
    expect(doors[0]?.posX).toBeGreaterThan(0);
  });

  it("resolveCornerDoorGapSettings usa portas do schema (folga dinâmica)", () => {
    const resolved = resolveCornerDoorGapSettings(settingsDefaults);
    expect(resolved.gapVerticalMm).toBe(gaps.portaGapVerticalMm);
    expect(resolved.gapHorizontalMm).toBe(gaps.portaGapHorizontalMm);
    expect(resolved.doorFixedGapMm).toBe(gaps.portaGapDuplaMm);
  });

  it("gera furos de cavilha: cima/fundo/lateral esq + 6 ligações na frente fixa", () => {
    const ffW = 448;
    const ffH = 720;
    const latH = 682;
    const thickness = 19;
    const edgeOffset = thickness / 2;
    const depthOffset = 60;
    const holes = buildCornerFixedFrontDowelHoles(
      {
        fixedFrontWidthMm: ffW,
        fixedFrontHeightMm: ffH,
        panelWidthMm: 900,
        fixedFrontSide: "left",
        thicknessMm: thickness,
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

    expect(holes.cima[0]?.x).toBe(depthOffset);
    expect(holes.cima[1]?.x).toBe(ffW - depthOffset);
    expect(holes.lateral_esquerda?.[0]?.y).toBe(latH - edgeOffset);
    expect(holes.lateral_esquerda?.[1]?.y).toBe(edgeOffset);
    expect(holes.frente_fixa.some((h) => h.x === depthOffset && h.y === ffH - edgeOffset)).toBe(true);
    expect(holes.frente_fixa.some((h) => h.x === ffW - depthOffset && h.y === ffH - edgeOffset)).toBe(true);
  });

  it("alinha furos laterais da frente fixa com a altura da lateral", () => {
    const edgeOffset = 9.5;
    const y = resolveFrenteFixaLateralHoleYFromTop(720, 682, edgeOffset);
    expect(y.topY).toBe(691.5);
    expect(y.bottomY).toBe(28.5);
  });

  it("espelha furos na lateral direita e cima/fundo quando FF está à direita", () => {
    const ffW = 448;
    const holes = buildCornerFixedFrontDowelHoles(
      {
        fixedFrontWidthMm: ffW,
        fixedFrontHeightMm: 720,
        panelWidthMm: 900,
        fixedFrontSide: "right",
        thicknessMm: 19,
      },
      682
    );

    expect(holes.lateral_esquerda).toBeUndefined();
    expect(holes.lateral_direita).toHaveLength(2);
    expect(holes.cima[0]?.x).toBe(900 - ffW + 60);
    expect(holes.cima[1]?.x).toBe(840);
  });

  it("furos lateral esquerda ↔ frente fixa: mesma distância da borda e altura alinhada", () => {
    const ffW = 398;
    const ffH = 900;
    const latH = 862;
    const thickness = 19;
    const edgeOffset = thickness / 2;
    const depthOffset = 60;
    const holes = buildCornerFixedFrontDowelHoles(
      {
        fixedFrontWidthMm: ffW,
        fixedFrontHeightMm: ffH,
        panelWidthMm: 800,
        fixedFrontSide: "left",
        thicknessMm: thickness,
      },
      latH
    );
    const lateralY = resolveFrenteFixaLateralHoleYFromTop(ffH, latH, edgeOffset);
    const latHoles = holes.lateral_esquerda ?? [];
    const ffLateralHoles = holes.frente_fixa.filter(
      (h) =>
        Math.abs(h.x - edgeOffset) < 0.01 &&
        (Math.abs(h.y - lateralY.topY) < 0.01 || Math.abs(h.y - lateralY.bottomY) < 0.01)
    );

    expect(latHoles).toHaveLength(2);
    expect(ffLateralHoles).toHaveLength(2);
    expect(latHoles[0]?.x).toBe(depthOffset);
    expect(ffLateralHoles[0]?.x).toBe(edgeOffset);
    expect(ffLateralHoles[0]?.y).toBe(lateralY.topY);
    expect(ffLateralHoles[1]?.y).toBe(lateralY.bottomY);
    expect(latHoles[0]?.y).toBe(latH - edgeOffset);
    expect(latHoles[1]?.y).toBe(edgeOffset);
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
    expect(migrated.doorsLayer[0]?.hingeSide).toBe("left");
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
    expect(box.doorsLayer[0]?.hingeSide).toBe("left");
    expect(box.doorsLayer[0]?.width).toBe(447);
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
    expect(doors[0]?.hingeSide).toBe("left");
    expect(doors[0]?.width).toBe(447);
    expect(doors[0]?.height).toBe(716);
    expect(doors[0]?.cornerDireitaV2Viewer).toBe(true);
    expect(doors[0]?.viewerHingePivotXMm).toBeCloseTo(1, 5);
  });

  it("manufacturing v2: frente_fixa 447×720 + 1 porta", () => {
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
    expect(ff?.largura_mm).toBe(447);
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
    expect(ff?.dimensoes?.largura).toBe(447);
    expect(ff?.dimensoes?.altura).toBe(720);
    expect(portas).toHaveLength(1);
    expect(latEsq?.drillHoles?.some((h) => h.holeType === "dobradica")).toBe(false);
    expect(ff?.drillHoles?.length).toBeGreaterThan(0);
  });

  it("cutlist v2: dobradiças na frente_fixa (31 mm + esp/2), lateral direita sem furos de dobradiça", () => {
    const box: BoxModule = {
      id: "box-v2-hinge",
      baseCabinetId: CORNER_DIREITA_INFERIOR_V2_ID,
      dimensoes: { largura: 900, altura: 720, profundidade: 600 },
      espessura: 19,
      portaTipo: "porta_simples",
      prateleiras: 0,
      gavetas: 0,
      material: "mdf_branco",
    };
    const items = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const ff = items.find((i) => i.tipo === "frente_fixa");
    const latDir = items.find((i) => i.tipo === "lateral_direita");
    const porta = items.find((i) => i.tipo === "porta_simples");

    expect(latDir?.drillHoles?.some((h) => h.holeType?.startsWith("dobradica"))).toBe(false);
    const ffHinge = ff?.drillHoles?.filter((h) => h.holeType?.startsWith("dobradica")) ?? [];
    expect(ffHinge.length).toBeGreaterThanOrEqual(6);

    const edgeOffset = 9.5;
    const ffW = ff?.dimensoes?.largura ?? 448;
    expect(ffHinge.some((h) => Math.abs(h.x - (ffW - edgeOffset)) < 0.01)).toBe(true);
    expect(ffHinge.some((h) => Math.abs(h.x - CORNER_FF_HINGE_DEPTH_FROM_FRONT_MM) < 0.01)).toBe(true);

    const doorCaneco = porta?.drillHoles?.filter((h) => h.holeType === "dobradica") ?? [];
    expect(doorCaneco.length).toBeGreaterThanOrEqual(2);
    expect(ffHinge.filter((h) => h.holeType === "dobradica_parafuso_uniao").length).toBe(doorCaneco.length);
  });

  it("mirrorDoorHingeHolesX espelha X mantendo Y", () => {
    const mirrored = mirrorDoorHingeHolesX(
      [
        { x: 400, y: 100, diameter: 35, depth: 13, holeType: "dobradica", topDrillable: true, face: "B" },
        { x: 60, y: 200, diameter: 10, depth: 12, holeType: "dobradica_fixacao", topDrillable: true, face: "B" },
      ],
      448
    );
    expect(mirrored[0]?.x).toBe(48);
    expect(mirrored[0]?.y).toBe(100);
    expect(mirrored[1]?.x).toBe(388);
  });

  it("cutlist v2: furos de dobradiça da porta no lado esquerdo (espelhados)", () => {
    const box: BoxModule = {
      id: "box-v2-door-left",
      baseCabinetId: CORNER_DIREITA_INFERIOR_V2_ID,
      dimensoes: { largura: 900, altura: 720, profundidade: 600 },
      espessura: 19,
      portaTipo: "porta_simples",
      prateleiras: 0,
      gavetas: 0,
      material: "mdf_branco",
    };
    const items = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const porta = items.find((i) => i.tipo === "porta_simples");
    const doorW = porta?.dimensoes?.largura ?? 448;
    const caneco = porta?.drillHoles?.find((h) => h.holeType === "dobradica");
    expect(caneco).toBeTruthy();
    expect(caneco!.x).toBeLessThan(doorW / 2);
    expect(caneco!.x).toBeLessThan(80);
  });

  it("buildCornerFixedFrontHingeHoles: calço na borda esp/2, união a 31 mm da frente", () => {
    const ffW = 448;
    const ffH = 720;
    const t = 19;
    const holes = buildCornerFixedFrontHingeHoles(
      {
        fixedFrontWidthMm: ffW,
        fixedFrontHeightMm: ffH,
        fixedFrontSide: "left",
        thicknessMm: t,
        hingePositionsMm: [100, 600],
      },
      defaultRulesConfig
    );
    expect(holes).toHaveLength(6);
    expect(holes.every((h) => h.topDrillable === true && h.face === "B")).toBe(true);
    expect(holes.filter((h) => h.holeType === "dobradica_fixacao").every((h) => Math.abs(h.x - (ffW - t / 2)) < 0.01)).toBe(true);
    expect(holes.filter((h) => h.holeType === "dobradica_parafuso_uniao").every((h) => Math.abs(h.x - CORNER_FF_HINGE_DEPTH_FROM_FRONT_MM) < 0.01)).toBe(true);
    const yCenter100 = ffH - (100 + t);
    expect(holes.some((h) => Math.abs(h.y - yCenter100) < 0.01)).toBe(true);
  });

  it("visual v2: frente fixa 447×720 mm no viewer", () => {
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
    expect(visual.fixedFront.size[0]).toBeCloseTo(0.447, 3);
    expect(visual.fixedFront.size[1]).toBeCloseTo(0.72, 3);
    expect(visual.fixedFront.pos[0]).toBeLessThan(0);
  });

  it("layout v2: frente fixa = metade esquerda porta dupla, altura total do módulo", () => {
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
    expect(layout.fixedFrontWidthMm).toBe(447);
    expect(layout.fixedFrontHeightMm).toBe(720);
    expect(layout.doorWidthMm).toBe(447);
    expect(layout.doorHeightMm).toBe(716);
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
      item("frente_fixa", [faceHole, { ...faceHole, x: 122 }], { largura: 448, altura: 720 }),
    ];
    const files = buildDrillFilesForProject(items, project);
    expect(files.length).toBe(4);
    for (const f of files) {
      expect(f.xml).toContain("KDTPanelFormat");
      expect(f.xml).toContain("Diameter>10.00");
    }
  });
});
