import type { CornerCabinetConfig, CornerLayoutMm, CornerSide } from "./cornerCabinetRules";
import { computeCornerLayoutMm } from "./cornerCabinetRules";

export type CornerVisualLayoutInput = {
  widthM: number;
  heightM: number;
  depthM: number;
  thicknessM: number;
  side: CornerSide;
  config: CornerCabinetConfig;
  gapVerticalMm?: number;
  gapHorizontalMm?: number;
  doorFixedGapMm?: number;
  doorPosZOffsetMm?: number;
};

export type CornerVisualSpec = {
  fixedFront: {
    size: [number, number, number];
    pos: [number, number, number];
  };
  doorFrameInsetM: number;
};

export function computeCornerVisualLayout(input: CornerVisualLayoutInput): CornerVisualSpec {
  const layoutMm = computeCornerLayoutMm({
    boxWidthMm: input.widthM * 1000,
    boxHeightMm: input.heightM * 1000,
    boxDepthMm: input.depthM * 1000,
    thicknessMm: input.thicknessM * 1000,
    side: input.side,
    config: input.config,
    gapVerticalMm: input.gapVerticalMm,
    gapHorizontalMm: input.gapHorizontalMm,
    doorFixedGapMm: input.doorFixedGapMm,
    doorPosZOffsetMm: input.doorPosZOffsetMm,
  });

  return cornerLayoutMmToVisual(layoutMm, input.thicknessM, input.depthM);
}

export function cornerLayoutMmToVisual(
  layout: CornerLayoutMm,
  thicknessM: number,
  depthM: number
): CornerVisualSpec {
  const ffW = layout.fixedFrontWidthMm / 1000;
  const ffH = (layout.fixedFrontHeightMm ?? layout.doorHeightMm) / 1000;
  const ffX = layout.fixedFront.posX / 1000;
  const ffY = layout.fixedFront.posY / 1000;
  const ffZ = layout.fixedFront.posZ / 1000 - depthM / 2 + thicknessM / 2;

  return {
    fixedFront: {
      size: [ffW, ffH, thicknessM],
      pos: [ffX, ffY, ffZ],
    },
    doorFrameInsetM: layout.doorFrameVisualMm / 1000,
  };
}
