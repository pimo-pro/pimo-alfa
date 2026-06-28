import { describe, expect, it } from "vitest";
import { settingsDefaults } from "../settings/settingsSchema";
import {
  computeCornerLayoutMm,
  getCornerCabinetConfig,
  CORNER_FF_COZINHA_INFERIOR_ID,
  resolveCornerDoorGapSettings,
} from "./cornerCabinetRules";
import {
  buildCornerFixedFrontDowelHoles,
  countCornerFixedFrontFaceDowelConnections,
  CORNER_FF_EDGE_DOWEL_DEPTH_MM,
  CORNER_FF_FACE_DOWEL_DEPTH_MM,
  dedupePanelDrillHoles,
  resolveFrenteFixaLateralHoleYFromTop,
} from "./cornerFixedFrontDowels";
import { buildDrillFilesForProject } from "../drill/drillExport";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { CutListItemComPreco } from "../types";

describe("cornerCabinet — Canto Direita Inferior", () => {
  const cfg = getCornerCabinetConfig(CORNER_FF_COZINHA_INFERIOR_ID)!;
  const gaps = settingsDefaults.portas;

  it("layout direita: frente fixa à esquerda, porta à direita, folgas vindas de settings", () => {
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

    const doorHeight = 720 - 2 * gaps.portaGapVerticalMm;
    expect(layout.doorHeightMm).toBe(doorHeight);
    expect(layout.fixedFrontWidthMm).toBe(180 + gaps.portaGapHorizontalMm);
    expect(layout.fixedFrontHeightMm).toBe(doorHeight + gaps.portaGapVerticalMm);
    expect(layout.door.hingeSide).toBe("right");
    expect(layout.fixedFront.posX).toBeLessThan(0);
    expect(layout.door.centerX).toBeGreaterThan(0);
  });

  it("resolveCornerDoorGapSettings usa portas do schema (folga dinâmica)", () => {
    const resolved = resolveCornerDoorGapSettings(settingsDefaults);
    expect(resolved.gapVerticalMm).toBe(gaps.portaGapVerticalMm);
    expect(resolved.gapHorizontalMm).toBe(gaps.portaGapHorizontalMm);
    expect(resolved.doorFixedGapMm).toBe(gaps.portaGapDuplaMm);
  });

  it("gera furos de cavilha: cima/fundo/lateral esq + 6 ligações na frente fixa", () => {
    const ffW = 181;
    const ffH = 719;
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
    const y = resolveFrenteFixaLateralHoleYFromTop(719, 682, 60);
    expect(y.topY).toBe(78.5);
    expect(y.bottomY).toBe(640.5);
  });

  it("espelha furos na lateral direita e cima/fundo quando FF está à direita", () => {
    const ffW = 181;
    const holes = buildCornerFixedFrontDowelHoles(
      {
        fixedFrontWidthMm: ffW,
        fixedFrontHeightMm: 719,
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
      item("cima", [edgeHole, { ...edgeHole, x: 121 }], { largura: 900, altura: 560 }),
      item("fundo", [edgeHole, { ...edgeHole, x: 121 }], { largura: 900, altura: 560 }),
      item("frente_fixa", [faceHole, { ...faceHole, x: 121 }], { largura: 181, altura: 719 }),
    ];
    const files = buildDrillFilesForProject(items, project);
    expect(files.length).toBe(4);
    for (const f of files) {
      expect(f.xml).toContain("KDTPanelFormat");
      expect(f.xml).toContain("Diameter>10.00");
    }
  });
});
