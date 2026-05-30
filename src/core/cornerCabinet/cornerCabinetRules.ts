import type { WorkspaceBox } from "../types";

export type CornerStyle = "cozinha" | "roupeiro";
export type CornerSide = "left" | "right";

export type CornerCabinetConfig = {
  style: CornerStyle;
  fixedFrontWidthMm: number;
  shelfDepthExtraRecessMm: number;
  doorFrameVisualMm: number;
  defaultSide: CornerSide;
};

const CORNER_MODEL_CONFIG: Record<string, CornerCabinetConfig> = {
  "corner-ff-cozinha-inferior": {
    style: "cozinha",
    fixedFrontWidthMm: 180,
    shelfDepthExtraRecessMm: 40,
    doorFrameVisualMm: 0,
    defaultSide: "right",
  },
  "corner-ff-cozinha-superior": {
    style: "cozinha",
    fixedFrontWidthMm: 180,
    shelfDepthExtraRecessMm: 40,
    doorFrameVisualMm: 0,
    defaultSide: "right",
  },
  "corner-ff-roupeiro-inferior": {
    style: "roupeiro",
    fixedFrontWidthMm: 280,
    shelfDepthExtraRecessMm: 0,
    doorFrameVisualMm: 8,
    defaultSide: "right",
  },
  "corner-ff-roupeiro-superior": {
    style: "roupeiro",
    fixedFrontWidthMm: 280,
    shelfDepthExtraRecessMm: 0,
    doorFrameVisualMm: 8,
    defaultSide: "right",
  },
};

export function isCornerFixedFrontModel(baseCabinetId?: string | null): boolean {
  return typeof baseCabinetId === "string" && baseCabinetId.startsWith("corner-ff-");
}

export function getCornerCabinetConfig(baseCabinetId?: string | null): CornerCabinetConfig | null {
  if (!baseCabinetId) return null;
  return CORNER_MODEL_CONFIG[baseCabinetId] ?? null;
}

/** Inverte lado quando o módulo está rodado ~180° no eixo Y. */
export function inferCornerSideFromBox(box: {
  baseCabinetId?: string;
  rotacaoY?: number;
}): CornerSide {
  const cfg = getCornerCabinetConfig(box.baseCabinetId);
  const base = cfg?.defaultSide ?? "right";
  const rot = box.rotacaoY ?? 0;
  const flipped = Math.abs(Math.abs(rot) - Math.PI) < 0.35;
  if (!flipped) return base;
  return base === "right" ? "left" : "right";
}

export type CornerLayoutInput = {
  boxWidthMm: number;
  boxHeightMm: number;
  boxDepthMm: number;
  thicknessMm: number;
  side: CornerSide;
  config: CornerCabinetConfig;
  gapVerticalMm?: number;
  gapHorizontalMm?: number;
  doorFixedGapMm?: number;
  doorPosZOffsetMm?: number;
};

export type CornerLayoutMm = {
  fixedFrontWidthMm: number;
  doorWidthMm: number;
  doorHeightMm: number;
  side: CornerSide;
  shelfDepthExtraRecessMm: number;
  doorFrameVisualMm: number;
  door: {
    posX: number;
    posY: number;
    posZ: number;
    hingeSide: "left" | "right";
    openDirection: "left" | "right";
    pivot: "left-edge" | "right-edge";
    pivotX: number;
    centerX: number;
  };
  fixedFront: {
    posX: number;
    posY: number;
    posZ: number;
  };
};

export function computeCornerLayoutMm(input: CornerLayoutInput): CornerLayoutMm {
  const gapV = Math.max(0, input.gapVerticalMm ?? 0);
  const gapH = Math.max(0, input.gapHorizontalMm ?? 0);
  const doorFixedGap = Math.max(0, input.doorFixedGapMm ?? 2);
  const doorHeight = Math.max(1, input.boxHeightMm - 2 * gapV);
  const fixedFrontWidth = Math.max(40, input.config.fixedFrontWidthMm);
  const doorWidth = Math.max(
    80,
    input.boxWidthMm - 2 * gapH - fixedFrontWidth - doorFixedGap
  );
  const doorPosZ = input.boxDepthMm / 2 + Math.max(0, input.doorPosZOffsetMm ?? 0);
  const doorPosY = 0;

  if (input.side === "right") {
    const fixedFrontCenterX = input.boxWidthMm / 2 - gapH - fixedFrontWidth / 2;
    const doorCenterX = -input.boxWidthMm / 2 + gapH + doorWidth / 2;
    const pivotX = doorCenterX + doorWidth / 2;
    return {
      fixedFrontWidthMm: fixedFrontWidth,
      doorWidthMm: doorWidth,
      doorHeightMm: doorHeight,
      side: input.side,
      shelfDepthExtraRecessMm: input.config.shelfDepthExtraRecessMm,
      doorFrameVisualMm: input.config.doorFrameVisualMm,
      door: {
        posX: pivotX,
        posY: doorPosY,
        posZ: doorPosZ,
        hingeSide: "right",
        openDirection: "left",
        pivot: "right-edge",
        pivotX,
        centerX: doorCenterX,
      },
      fixedFront: {
        posX: fixedFrontCenterX,
        posY: doorPosY,
        posZ: doorPosZ,
      },
    };
  }

  const fixedFrontCenterX = -input.boxWidthMm / 2 + gapH + fixedFrontWidth / 2;
  const doorCenterX = input.boxWidthMm / 2 - gapH - doorWidth / 2;
  const pivotX = doorCenterX - doorWidth / 2;
  return {
    fixedFrontWidthMm: fixedFrontWidth,
    doorWidthMm: doorWidth,
    doorHeightMm: doorHeight,
    side: input.side,
    shelfDepthExtraRecessMm: input.config.shelfDepthExtraRecessMm,
    doorFrameVisualMm: input.config.doorFrameVisualMm,
    door: {
      posX: pivotX,
      posY: doorPosY,
      posZ: doorPosZ,
      hingeSide: "left",
      openDirection: "right",
      pivot: "left-edge",
      pivotX,
      centerX: doorCenterX,
    },
    fixedFront: {
      posX: fixedFrontCenterX,
      posY: doorPosY,
      posZ: doorPosZ,
    },
  };
}

export function computeCornerLayoutForBox(
  box: Pick<WorkspaceBox, "baseCabinetId" | "rotacaoY" | "dimensoes" | "espessura">,
  settings: { gapVerticalMm: number; gapHorizontalMm: number; doorPosZOffsetMm: number }
): CornerLayoutMm | null {
  const cfg = getCornerCabinetConfig(box.baseCabinetId);
  if (!cfg) return null;
  const side = inferCornerSideFromBox(box);
  return computeCornerLayoutMm({
    boxWidthMm: box.dimensoes.largura,
    boxHeightMm: box.dimensoes.altura,
    boxDepthMm: box.dimensoes.profundidade,
    thicknessMm: box.espessura || 18,
    side,
    config: cfg,
    gapVerticalMm: settings.gapVerticalMm,
    gapHorizontalMm: settings.gapHorizontalMm,
    doorPosZOffsetMm: settings.doorPosZOffsetMm,
  });
}
