import type { WorkspaceBox } from "../types";
import { getSettings } from "../settings/settingsService";

export type CornerDoorGapSettings = {
  gapVerticalMm: number;
  gapHorizontalMm: number;
  doorFixedGapMm: number;
  doorPosZOffsetMm: number;
};

/** Folgas de porta (settings.portas) — porta direita segue regras de porta dupla; frente fixa = metade esquerda + folgas topo/esquerda. */
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
/** Orientação do módulo canto v2 (UI / persistência). */
export type CornerOrientation = "direita" | "esquerda";
export type CornerLayoutMode = "legacy" | "direita";

export const CORNER_FF_COZINHA_INFERIOR_ID = "corner-ff-cozinha-inferior";

/** Modelo industrial v2 — layout SSOT; não usa doorsLayer legado. */
export const CORNER_DIREITA_INFERIOR_V2_ID = "corner-direita-inferior-v2";

/** Compensação legada (+2 mm) — apenas modelos corner-ff-* sem layoutMode direita. */
export const CORNER_FIXED_FRONT_OVERSIZE_MM = 2;

export type CornerCabinetConfig = {
  style: CornerStyle;
  fixedFrontWidthMm: number;
  shelfDepthExtraRecessMm: number;
  doorFrameVisualMm: number;
  defaultSide: CornerSide;
  /** direita = frente fixa à esquerda, porta à direita (Canto — Direita Inferior). */
  layoutMode?: CornerLayoutMode;
};

const CORNER_DIREITA_INFERIOR_CONFIG: CornerCabinetConfig = {
  style: "cozinha",
  fixedFrontWidthMm: 0,
  shelfDepthExtraRecessMm: 40,
  doorFrameVisualMm: 0,
  defaultSide: "right",
  layoutMode: "direita",
};

const CORNER_MODEL_CONFIG: Record<string, CornerCabinetConfig> = {
  [CORNER_DIREITA_INFERIOR_V2_ID]: { ...CORNER_DIREITA_INFERIOR_CONFIG },
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
  if (!baseCabinetId) return false;
  return baseCabinetId === CORNER_DIREITA_INFERIOR_V2_ID || baseCabinetId.startsWith("corner-ff-");
}

/** Modelo v2: portas e furação derivam sempre do layout industrial (ignora doorsLayer persistido). */
export function isCornerLayoutSsotModel(baseCabinetId?: string | null): boolean {
  return baseCabinetId === CORNER_DIREITA_INFERIOR_V2_ID;
}

export function isCornerDireitaInferiorV2Model(baseCabinetId?: string | null): boolean {
  return baseCabinetId === CORNER_DIREITA_INFERIOR_V2_ID;
}

export function isCornerDireitaInferiorModel(baseCabinetId?: string | null): boolean {
  return baseCabinetId === CORNER_DIREITA_INFERIOR_V2_ID;
}

export function getCornerCabinetConfig(baseCabinetId?: string | null): CornerCabinetConfig | null {
  if (!baseCabinetId) return null;
  return CORNER_MODEL_CONFIG[baseCabinetId] ?? null;
}

/** Inverte lado quando o módulo está rodado ~180° no eixo Y (legado / corner-ff). */
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

export function resolveCornerOrientationFromBox(box: {
  orientation?: CornerOrientation;
}): CornerOrientation {
  return box.orientation === "esquerda" ? "esquerda" : "direita";
}

export function resolveCornerSideFromOrientation(orientation: CornerOrientation): CornerSide {
  return orientation === "esquerda" ? "left" : "right";
}

/** Lado efectivo do layout — v2 usa `orientation`; legado usa rotação Y. */
export function resolveCornerSideForBox(box: {
  baseCabinetId?: string;
  orientation?: CornerOrientation;
  rotacaoY?: number;
}): CornerSide {
  if (isCornerDireitaInferiorV2Model(box.baseCabinetId)) {
    return resolveCornerSideFromOrientation(resolveCornerOrientationFromBox(box));
  }
  return inferCornerSideFromBox(box);
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
  /** Porta esquerda hipotética (vão esquerdo do módulo de canto). */
  leftDoorWidthMm: number;
  leftDoorHeightMm: number;
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
    /** Valor para cornerCabinetVisual (compensado); plano frontal = door.posZ. */
    posZ: number;
  };
  /** Posição da porta esquerda hipotética (porta dupla) — referência da frente fixa. */
  leftDoor: {
    centerX: number;
    pivotX: number;
    posY: number;
    posZ: number;
  };
};

/** Centro X da folha esquerda numa porta dupla simétrica (boxLayersService). */
export function computeLeftDoubleDoorCenterX(leafWidthMm: number, doorFixedGapMm: number): number {
  return -(leafWidthMm / 2 + doorFixedGapMm / 2);
}

/** Pivot X da folha esquerda (left-edge). */
export function computeLeftDoubleDoorPivotX(leafWidthMm: number, doorFixedGapMm: number): number {
  return computeLeftDoubleDoorCenterX(leafWidthMm, doorFixedGapMm) - leafWidthMm / 2;
}

/** Centro X da folha direita numa porta dupla simétrica. */
export function computeRightDoubleDoorCenterX(leafWidthMm: number, doorFixedGapMm: number): number {
  return leafWidthMm / 2 + doorFixedGapMm / 2;
}

/** Pivot X da folha direita (right-edge). */
export function computeRightDoubleDoorPivotX(leafWidthMm: number, doorFixedGapMm: number): number {
  return computeRightDoubleDoorCenterX(leafWidthMm, doorFixedGapMm) + leafWidthMm / 2;
}

/**
 * cornerCabinetVisual aplica: viewerZ = posZ/1000 - depth/2 + thickness/2.
 * Codifica posZ para o plano frontal coincidir com doorsLayer.posZ (= doorPosZ).
 */
export function encodeFixedFrontViewerPosZ(
  doorPlanePosZMm: number,
  boxDepthMm: number,
  thicknessMm: number
): number {
  return doorPlanePosZMm + boxDepthMm / 2 - thicknessMm / 2;
}

/** Largura de cada folha numa porta dupla simétrica (metades iguais). */
function computeDoubleDoorHalfWidthMm(input: CornerLayoutInput): number {
  const gapH = Math.max(0, input.gapHorizontalMm ?? 0);
  const doorFixedGap = Math.max(0, input.doorFixedGapMm ?? 0);
  return Math.max(40, (input.boxWidthMm - 2 * gapH - doorFixedGap) / 2);
}

/** Porta esquerda hipotética — mesmas regras que porta dupla (metade esquerda). */
function computeHypotheticalLeftDoorMm(
  input: CornerLayoutInput,
  rightDoorHeightMm: number
): { widthMm: number; heightMm: number } {
  if (input.config.layoutMode === "direita") {
    const widthMm = computeDoubleDoorHalfWidthMm(input);
    return { widthMm, heightMm: rightDoorHeightMm };
  }
  return {
    widthMm: Math.max(40, input.config.fixedFrontWidthMm),
    heightMm: rightDoorHeightMm,
  };
}

function buildCornerDireitaLayoutResult(
  input: CornerLayoutInput,
  params: {
    side: CornerSide;
    gapH: number;
    rightDoorHeight: number;
    rightDoorWidth: number;
    leftDoor: { widthMm: number; heightMm: number };
    fixedFrontWidth: number;
    fixedFrontHeight: number;
    fixedFrontCenterX: number;
    fixedFrontPosY: number;
    fixedFrontPosZ: number;
    leftDoorCenterX: number;
    leftDoorPivotX: number;
    doorCenterX: number;
    pivotX: number;
    hingeSide: "left" | "right";
    openDirection: "left" | "right";
    pivot: "left-edge" | "right-edge";
    doorPosZ: number;
  }
): CornerLayoutMm {
  return {
    fixedFrontWidthMm: params.fixedFrontWidth,
    fixedFrontHeightMm: params.fixedFrontHeight,
    leftDoorWidthMm: params.leftDoor.widthMm,
    leftDoorHeightMm: params.leftDoor.heightMm,
    doorWidthMm: params.rightDoorWidth,
    doorHeightMm: params.rightDoorHeight,
    side: params.side,
    shelfDepthExtraRecessMm: input.config.shelfDepthExtraRecessMm,
    doorFrameVisualMm: input.config.doorFrameVisualMm,
    door: {
      posX: params.pivotX,
      posY: 0,
      posZ: params.doorPosZ,
      hingeSide: params.hingeSide,
      openDirection: params.openDirection,
      pivot: params.pivot,
      pivotX: params.pivotX,
      centerX: params.doorCenterX,
    },
    fixedFront: {
      posX: params.fixedFrontCenterX,
      posY: params.fixedFrontPosY,
      posZ: params.fixedFrontPosZ,
    },
    leftDoor: {
      centerX: params.leftDoorCenterX,
      pivotX: params.leftDoorPivotX,
      posY: params.fixedFrontPosY,
      posZ: params.doorPosZ,
    },
  };
}

function computeCornerDireitaLayoutMm(input: CornerLayoutInput): CornerLayoutMm {
  const gapV = Math.max(0, input.gapVerticalMm ?? 0);
  const gapH = Math.max(0, input.gapHorizontalMm ?? 0);
  const doorFixedGap = Math.max(0, input.doorFixedGapMm ?? 0);
  const thicknessMm = Math.max(1, input.thicknessMm);
  const rightDoorHeight = Math.max(1, input.boxHeightMm - 2 * gapV);
  const leftDoor = computeHypotheticalLeftDoorMm(input, rightDoorHeight);
  const rightDoorWidth = leftDoor.widthMm;
  const fixedFrontWidth = leftDoor.widthMm;
  const fixedFrontHeight = input.boxHeightMm;
  const doorPosY = 0;
  const doorPosZ = input.boxDepthMm / 2 + Math.max(0, input.doorPosZOffsetMm ?? 0);
  const fixedFrontPosZ = encodeFixedFrontViewerPosZ(doorPosZ, input.boxDepthMm, thicknessMm);

  if (input.side === "right") {
    const leftDoorCenterX = computeLeftDoubleDoorCenterX(rightDoorWidth, doorFixedGap);
    const leftDoorPivotX = computeLeftDoubleDoorPivotX(rightDoorWidth, doorFixedGap);
    const doorCenterX = computeRightDoubleDoorCenterX(rightDoorWidth, doorFixedGap);
    const pivotX = computeRightDoubleDoorPivotX(rightDoorWidth, doorFixedGap);
    return buildCornerDireitaLayoutResult(input, {
      side: input.side,
      gapH,
      rightDoorHeight,
      rightDoorWidth,
      leftDoor,
      fixedFrontWidth,
      fixedFrontHeight,
      fixedFrontCenterX: leftDoorCenterX,
      fixedFrontPosY: doorPosY,
      fixedFrontPosZ,
      leftDoorCenterX,
      leftDoorPivotX,
      doorCenterX,
      pivotX,
      hingeSide: "left",
      openDirection: "left",
      pivot: "right-edge",
      doorPosZ,
    });
  }

  const leftDoorCenterX = computeRightDoubleDoorCenterX(rightDoorWidth, doorFixedGap);
  const leftDoorPivotX = computeRightDoubleDoorPivotX(rightDoorWidth, doorFixedGap);
  const doorCenterX = computeLeftDoubleDoorCenterX(rightDoorWidth, doorFixedGap);
  const pivotX = doorCenterX + rightDoorWidth / 2;
  return buildCornerDireitaLayoutResult(input, {
    side: input.side,
    gapH,
    rightDoorHeight,
    rightDoorWidth,
    leftDoor,
    fixedFrontWidth,
    fixedFrontHeight,
    fixedFrontCenterX: leftDoorCenterX,
    fixedFrontPosY: doorPosY,
    fixedFrontPosZ,
    leftDoorCenterX,
    leftDoorPivotX,
    doorCenterX,
    pivotX,
    hingeSide: "right",
    openDirection: "right",
    pivot: "right-edge",
    doorPosZ,
  });
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
      leftDoorWidthMm: fixedFrontWidth,
      leftDoorHeightMm: fixedFrontHeight,
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
        posZ: encodeFixedFrontViewerPosZ(doorPosZ, input.boxDepthMm, Math.max(1, input.thicknessMm)),
      },
      leftDoor: {
        centerX: fixedFrontCenterX,
        pivotX: fixedFrontCenterX - fixedFrontWidth / 2,
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
    leftDoorWidthMm: fixedFrontWidth,
    leftDoorHeightMm: fixedFrontHeight,
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
      posZ: encodeFixedFrontViewerPosZ(doorPosZ, input.boxDepthMm, Math.max(1, input.thicknessMm)),
    },
    leftDoor: {
      centerX: fixedFrontCenterX,
      pivotX: fixedFrontCenterX + fixedFrontWidth / 2,
      posY: doorPosY,
      posZ: doorPosZ,
    },
  };
}

export function computeCornerLayoutForBox(
  box: Pick<WorkspaceBox, "baseCabinetId" | "orientation" | "rotacaoY" | "dimensoes" | "espessura">,
  settings?: CornerDoorGapSettings
): CornerLayoutMm | null {
  const cfg = getCornerCabinetConfig(box.baseCabinetId);
  if (!cfg) return null;
  const gaps = settings ?? resolveCornerDoorGapSettings();
  const side = resolveCornerSideForBox(box);
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
