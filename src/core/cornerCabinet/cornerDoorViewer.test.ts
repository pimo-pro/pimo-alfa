import { describe, expect, it } from "vitest";
import {
  computeCornerLayoutMm,
  CORNER_DIREITA_INFERIOR_V2_ID,
  getCornerCabinetConfig,
} from "./cornerCabinetRules";
import { settingsDefaults } from "../settings/settingsSchema";
import {
  computeCornerV2HingePivotXMm,
  cornerDoorFreeEdgeWorldZ,
  isCornerV2DoorViewer,
  resolveCornerDoorTransformByOrientation,
} from "./cornerDoorViewer";

describe("cornerDoorViewer — Canto v2", () => {
  const cfg = getCornerCabinetConfig(CORNER_DIREITA_INFERIOR_V2_ID)!;
  const gaps = settingsDefaults.portas;

  it("identifica viewer v2 para hinge left e right", () => {
    expect(isCornerV2DoorViewer("right-edge", "left")).toBe(true);
    expect(isCornerV2DoorViewer("right-edge", "right")).toBe(true);
    expect(isCornerV2DoorViewer("left-edge", "left")).toBe(false);
  });

  it("direita: pivot FF + 2 mm; offset +largura/2; posição fechada inalterada", () => {
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

    const pivotEdgeM = layout.door.pivotX / 1000;
    const widthM = layout.doorWidthMm / 1000;
    const hingePivotMm = computeCornerV2HingePivotXMm({
      orientation: "direita",
      fixedFrontCenterXMm: layout.fixedFront.posX,
      fixedFrontWidthMm: layout.fixedFrontWidthMm,
    });

    const viewer = resolveCornerDoorTransformByOrientation({
      orientation: "direita",
      storedPivotEdgeXM: pivotEdgeM,
      hingePivotXM: hingePivotMm / 1000,
      pivotYM: 0,
      pivotZM: layout.door.posZ / 1000,
      widthM,
      baseRotationY: 0,
      isOpen: false,
      hingeSide: "left",
    });

    expect(viewer.pivotXM * 1000).toBeCloseTo(hingePivotMm, 5);
    expect(viewer.meshOffsetXM).toBeCloseTo(widthM / 2, 9);
    expect(viewer.pivotXM + viewer.meshOffsetXM).toBeCloseTo(pivotEdgeM - widthM / 2, 9);
  });

  it("direita aberta: -PI/2 outward (+Z)", () => {
    const open = resolveCornerDoorTransformByOrientation({
      orientation: "direita",
      storedPivotEdgeXM: 0.449,
      hingePivotXM: 0.001,
      pivotYM: 0,
      pivotZM: 0.3,
      widthM: 0.448,
      baseRotationY: 0,
      isOpen: true,
      hingeSide: "left",
    });
    expect(open.rotationY).toBeCloseTo(-Math.PI / 2, 9);
    expect(
      cornerDoorFreeEdgeWorldZ({
        hingePivotXM: 0.001,
        pivotZM: 0.3,
        widthM: 0.448,
        meshOffsetXM: open.meshOffsetXM,
        rotationY: open.rotationY,
        hingeSide: "left",
      })
    ).toBeGreaterThan(0.3);
  });

  it("esquerda aberta: +PI/2 outward (+Z)", () => {
    const open = resolveCornerDoorTransformByOrientation({
      orientation: "esquerda",
      storedPivotEdgeXM: -0.001,
      hingePivotXM: -0.001,
      pivotYM: 0,
      pivotZM: 0.3,
      widthM: 0.448,
      baseRotationY: 0,
      isOpen: true,
      hingeSide: "right",
    });
    expect(open.rotationY).toBeCloseTo(Math.PI / 2, 9);
    expect(open.meshOffsetXM).toBeCloseTo(-0.448 / 2, 9);
    expect(
      cornerDoorFreeEdgeWorldZ({
        hingePivotXM: -0.001,
        pivotZM: 0.3,
        widthM: 0.448,
        meshOffsetXM: open.meshOffsetXM,
        rotationY: open.rotationY,
        hingeSide: "right",
      })
    ).toBeGreaterThan(0.3);
  });
});
