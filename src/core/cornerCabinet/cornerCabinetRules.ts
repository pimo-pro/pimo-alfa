import type { WorkspaceBox } from "../types";
import { getSettings } from "../settings/settingsService";

export type CornerDoorGapSettings = {
  gapVerticalMm: number;
  gapHorizontalMm: number;
  doorFixedGapMm: number;
  doorPosZOffsetMm: number;
};

/** Folgas reais de porta (settings.portas) — fonte única para layout e frente fixa. */
export function resolveCornerDoorGapSettings(
  settings = getSettings()
): CornerDoorGapSettings {
  const portas = settings.portas;
  return {
    gapVerticalMm: Math.max(0, Number(portas.portaGapVerticalMm) || 0),
    gapHorizontalMm: Math.max(0, Number(portas.portaGapHorizontalMm) || 0),
    doorFixedGapMm: Math.max(0, Number(portas.portaGapDuplaMm) || 0),
    doorPosZOffsetMm: Math.max(0, Number(portas.portaPosZOffsetMm) || 0),
  };
}

export type CornerStyle = "cozinha" | "roupeiro";
export type CornerSide = "left" | "right";
export type CornerLayoutMode = "legacy" | "direita";

export const CORNER_FF_COZINHA_INFERIOR_ID = "corner-ff-cozinha-inferior";

export type CornerCabinetConfig = {
  style: CornerStyle;
  fixedFrontWidthMm: number;
  shelfDepthExtraRecessMm: number;
  doorFrameVisualMm: number;
  defaultSide: CornerSide;
  /** direita = frente fixa à esquerda, porta à direita (Canto — Direita Inferior). */
  layoutMode?: CornerLayoutMode;
};

const CORNER_MODEL_CONFIG: Record<string, CornerCabinetConfig> = {
  [CORNER_FF_COZINHA_INFERIOR_ID]: {
    style: "cozinha",
    fixedFrontWidthMm: 180,
    shelfDepthExtraRecessMm: 40,
    doorFrameVisualMm: 0,
    defaultSide: "right",
    layoutMode: "direita",
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

export function isCornerDireitaInferiorModel(baseCabinetId?: string | null): boolean {
  return baseCabinetId === CORNER_FF_COZINHA_INFERIOR_ID;
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
  fixedFrontHeightMm: number;
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

function computeCornerDireitaLayoutMm(input: CornerLayoutInput): CornerLayoutMm {
  const gapV = Math.max(0, input.gapVerticalMm ?? 0);
  const gapH = Math.max(0, input.gapHorizontalMm ?? 0);
  const doorFixedGap = Math.max(0, input.doorFixedGapMm ?? 0);
  const doorHeight = Math.max(1, input.boxHeightMm - 2 * gapV);
  const fixedFrontNominal = Math.max(40, input.config.fixedFrontWidthMm);
  const fixedFrontWidth = fixedFrontNominal + gapH;
  const fixedFrontHeight = doorHeight + gapV;
  const doorWidth = Math.max(
    80,
    input.boxWidthMm - 2 * gapH - fixedFrontNominal - doorFixedGap
  );
  const doorPosZ = input.boxDepthMm / 2 + Math.max(0, input.doorPosZOffsetMm ?? 0);
  const doorPosY = 0;
  const fixedFrontPosY = gapV / 2;

  if (input.side === "right") {
    const fixedFrontCenterX = -input.boxWidthMm / 2 + gapH + fixedFrontWidth / 2;
    const doorCenterX = input.boxWidthMm / 2 - gapH - doorWidth / 2;
    const pivotX = doorCenterX + doorWidth / 2;
    return {
      fixedFrontWidthMm: fixedFrontWidth,
      fixedFrontHeightMm: fixedFrontHeight,
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
        posY: fixedFrontPosY,
        posZ: doorPosZ,
      },
    };
  }

  const fixedFrontCenterX = input.boxWidthMm / 2 - gapH - fixedFrontWidth / 2;
  const doorCenterX = -input.boxWidthMm / 2 + gapH + doorWidth / 2;
  const pivotX = doorCenterX - doorWidth / 2;
  return {
    fixedFrontWidthMm: fixedFrontWidth,
    fixedFrontHeightMm: fixedFrontHeight,
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
      posY: fixedFrontPosY,
      posZ: doorPosZ,
    },
  };
}

export function computeCornerLayoutMm(input: CornerLayoutInput): CornerLayoutMm {
  if (input.config.layoutMode === "direita") {
    return computeCornerDireitaLayoutMm(input);
  }

  const gapV = Math.max(0, input.gapVerticalMm ?? 0);
  const gapH = Math.max(0, input.gapHorizontalMm ?? 0);
  const doorFixedGap = Math.max(0, input.doorFixedGapMm ?? 0);
  const doorHeight = Math.max(1, input.boxHeightMm - 2 * gapV);
  const fixedFrontWidth = Math.max(40, input.config.fixedFrontWidthMm);
  const doorWidth = Math.max(
    80,
    input.boxWidthMm - 2 * gapH - fixedFrontWidth - doorFixedGap
  );
  const doorPosZ = input.boxDepthMm / 2 + Math.max(0, input.doorPosZOffsetMm ?? 0);
  const doorPosY = 0;
  const fixedFrontHeight = doorHeight;

  if (input.side === "right") {
    const fixedFrontCenterX = input.boxWidthMm / 2 - gapH - fixedFrontWidth / 2;
    const doorCenterX = -input.boxWidthMm / 2 + gapH + doorWidth / 2;
    const pivotX = doorCenterX + doorWidth / 2;
    return {
      fixedFrontWidthMm: fixedFrontWidth,
      fixedFrontHeightMm: fixedFrontHeight,
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
    fixedFrontHeightMm: fixedFrontHeight,
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
  settings?: CornerDoorGapSettings
): CornerLayoutMm | null {
  const cfg = getCornerCabinetConfig(box.baseCabinetId);
  if (!cfg) return null;
  const gaps = settings ?? resolveCornerDoorGapSettings();
  const side = inferCornerSideFromBox(box);
  return computeCornerLayoutMm({
    boxWidthMm: box.dimensoes.largura,
    boxHeightMm: box.dimensoes.altura,
    boxDepthMm: box.dimensoes.profundidade,
    thicknessMm: box.espessura || 18,
    side,
    config: cfg,
    gapVerticalMm: gaps.gapVerticalMm,
    gapHorizontalMm: gaps.gapHorizontalMm,
    doorFixedGapMm: gaps.doorFixedGapMm,
    doorPosZOffsetMm: gaps.doorPosZOffsetMm,
  });
}
