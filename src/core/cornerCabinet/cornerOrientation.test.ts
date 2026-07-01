import { describe, expect, it } from "vitest";
import {
  computeCornerLayoutMm,
  CORNER_DIREITA_INFERIOR_V2_ID,
  getCornerCabinetConfig,
  resolveCornerSideForBox,
  resolveCornerSideFromOrientation,
} from "./cornerCabinetRules";
import { settingsDefaults } from "../settings/settingsSchema";
import { buildCornerDoorLayerItems } from "./cornerCabinetLayers";
import {
  computeCornerV2HingePivotXMm,
  cornerDoorFreeEdgeWorldZ,
  resolveCornerDoorTransformByOrientation,
} from "./cornerDoorViewer";

describe("cornerOrientation — Canto v2 dinâmico", () => {
  const cfg = getCornerCabinetConfig(CORNER_DIREITA_INFERIOR_V2_ID)!;
  const gaps = settingsDefaults.portas;

  const baseInput = {
    boxWidthMm: 900,
    boxHeightMm: 720,
    boxDepthMm: 600,
    thicknessMm: 19,
    config: cfg,
    gapVerticalMm: gaps.portaGapVerticalMm,
    gapHorizontalMm: gaps.portaGapHorizontalMm,
    doorFixedGapMm: gaps.portaGapDuplaMm,
  };

  it("resolveCornerSideFromOrientation mapeia direita/esquerda", () => {
    expect(resolveCornerSideFromOrientation("direita")).toBe("right");
    expect(resolveCornerSideFromOrientation("esquerda")).toBe("left");
  });

  it("orientation=direita: FF esquerda, porta esquerda (hinge left)", () => {
    const layout = computeCornerLayoutMm({ ...baseInput, side: "right" });
    expect(layout.fixedFront.posX).toBeLessThan(0);
    expect(layout.door.hingeSide).toBe("left");
    expect(layout.door.pivot).toBe("right-edge");
    expect(layout.door.openDirection).toBe("left");
  });

  it("orientation=esquerda: FF direita, porta direita (hinge right)", () => {
    const layout = computeCornerLayoutMm({ ...baseInput, side: "left" });
    expect(layout.fixedFront.posX).toBeGreaterThan(0);
    expect(layout.door.hingeSide).toBe("right");
    expect(layout.door.pivot).toBe("right-edge");
    expect(layout.door.openDirection).toBe("right");
    expect(Math.abs(layout.fixedFront.posX)).toBeCloseTo(Math.abs(
      computeCornerLayoutMm({ ...baseInput, side: "right" }).fixedFront.posX
    ), 0);
  });

  it("resolveCornerSideForBox usa orientation em v2", () => {
    expect(
      resolveCornerSideForBox({
        baseCabinetId: CORNER_DIREITA_INFERIOR_V2_ID,
        orientation: "esquerda",
      })
    ).toBe("left");
    expect(
      resolveCornerSideForBox({
        baseCabinetId: CORNER_DIREITA_INFERIOR_V2_ID,
        orientation: "direita",
      })
    ).toBe("right");
  });

  it("buildCornerDoorLayerItems propaga cornerOrientation e hinge pivot", () => {
    const doors = buildCornerDoorLayerItems({
      id: "box-esq",
      baseCabinetId: CORNER_DIREITA_INFERIOR_V2_ID,
      orientation: "esquerda",
      rotacaoY: 0,
      dimensoes: { largura: 900, altura: 720, profundidade: 600 },
      espessura: 19,
      portaTipo: "porta_simples",
    });
    expect(doors[0]?.cornerOrientation).toBe("esquerda");
    expect(doors[0]?.hingeSide).toBe("right");
    expect(doors[0]?.viewerHingePivotXMm).toBeCloseTo(-1, 5);
  });

  it("abertura outward: direita (-PI/2) e esquerda (+PI/2)", () => {
    const layoutD = computeCornerLayoutMm({ ...baseInput, side: "right" });
    const layoutE = computeCornerLayoutMm({ ...baseInput, side: "left" });
    const pivotZM = layoutD.door.posZ / 1000;
    const widthM = layoutD.doorWidthMm / 1000;

    const hingeD = computeCornerV2HingePivotXMm({
      orientation: "direita",
      fixedFrontCenterXMm: layoutD.fixedFront.posX,
      fixedFrontWidthMm: layoutD.fixedFrontWidthMm,
    }) / 1000;
    const hingeE = computeCornerV2HingePivotXMm({
      orientation: "esquerda",
      fixedFrontCenterXMm: layoutE.fixedFront.posX,
      fixedFrontWidthMm: layoutE.fixedFrontWidthMm,
    }) / 1000;

    const openD = resolveCornerDoorTransformByOrientation({
      orientation: "direita",
      storedPivotEdgeXM: layoutD.door.pivotX / 1000,
      hingePivotXM: hingeD,
      pivotYM: 0,
      pivotZM,
      widthM,
      baseRotationY: 0,
      isOpen: true,
      hingeSide: "left",
    });
    const openE = resolveCornerDoorTransformByOrientation({
      orientation: "esquerda",
      storedPivotEdgeXM: layoutE.door.pivotX / 1000,
      hingePivotXM: hingeE,
      pivotYM: 0,
      pivotZM,
      widthM,
      baseRotationY: 0,
      isOpen: true,
      hingeSide: "right",
    });

    expect(openD.rotationY).toBeCloseTo(-Math.PI / 2, 9);
    expect(openE.rotationY).toBeCloseTo(Math.PI / 2, 9);

    const closedFreeZ = pivotZM;
    const freeZD = cornerDoorFreeEdgeWorldZ({
      hingePivotXM: hingeD,
      pivotZM,
      widthM,
      meshOffsetXM: openD.meshOffsetXM,
      rotationY: openD.rotationY,
      hingeSide: "left",
    });
    const freeZE = cornerDoorFreeEdgeWorldZ({
      hingePivotXM: hingeE,
      pivotZM,
      widthM,
      meshOffsetXM: openE.meshOffsetXM,
      rotationY: openE.rotationY,
      hingeSide: "right",
    });

    expect(freeZD).toBeGreaterThan(closedFreeZ);
    expect(freeZE).toBeGreaterThan(closedFreeZ);
  });
});
