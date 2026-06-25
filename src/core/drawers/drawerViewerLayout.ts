/**
 * Geometria 3D unificada das gavetas (Viewer).
 * Origem local do grupo da gaveta: centro da frente externa (X/Y/Z).
 * Z+ = para a frente do módulo; Y+ = para cima.
 */
import { DRAWER_BODY_HEIGHT_BELOW_FRONT_MM } from "./drawerGeometryConstants";
import { isMetalBoxCatalogType } from "./drawerMetalBoxCatalog";
import {
  resolveDrawerBodyCenterZFromFrontMm,
  resolveDrawerFrontOuterZMm,
  resolveDrawerFrontPosZMm,
  resolveDrawerViewerBodyDepthMm,
} from "./drawerSlideDepth";

export type DrawerViewerPieceBox = {
  name: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

/** Altura do corpo madeira (laterais/costa) = frente − delta industrial. */
export function resolveDrawerWoodBodyHeightMm(
  frontHeightMm: number,
  deltaMm: number = DRAWER_BODY_HEIGHT_BELOW_FRONT_MM
): number {
  return Math.max(1, frontHeightMm - deltaMm);
}

/**
 * Offset Y do centro das laterais/costa para alinhar o fundo com o fundo da frente.
 * Frente centrada em Y=0 → laterais centradas em −delta/2.
 */
export function resolveDrawerBodyCenterOffsetYMm(
  deltaMm: number = DRAWER_BODY_HEIGHT_BELOW_FRONT_MM
): number {
  return -deltaMm / 2;
}

/** Centro Z do corpo (laterais/fundo) atrás da frente, coords locais (origem = centro da frente). */
export function resolveDrawerBodyCenterZMm(
  combinedFrontThicknessMm: number,
  bodyDepthMm: number
): number {
  return -(combinedFrontThicknessMm / 2 + bodyDepthMm / 2);
}

/** Centro Z da costa no fundo do corpo (coords locais). */
export function resolveDrawerBackCenterZMm(
  combinedFrontThicknessMm: number,
  bodyDepthMm: number,
  backThicknessMm: number
): number {
  return -(combinedFrontThicknessMm / 2 + bodyDepthMm - backThicknessMm / 2);
}

/** Centro Y do fundo (painel horizontal). */
export function resolveDrawerBottomCenterYMm(
  woodBodyHeightMm: number,
  bottomThicknessMm: number,
  bodyCenterOffsetYMm: number = resolveDrawerBodyCenterOffsetYMm()
): number {
  return -woodBodyHeightMm / 2 + bottomThicknessMm / 2 + bodyCenterOffsetYMm;
}

/**
 * Posição Z do grupo da gaveta no sistema local da caixa.
 * Face frontal externa da frente flush com a face frontal externa da caixa.
 */
export function resolveDrawerGroupPosZMm(
  profundidadeExternaMm: number,
  frontThicknessMm: number
): number {
  return resolveDrawerFrontPosZMm(profundidadeExternaMm, frontThicknessMm);
}

/** Laterais fabricadas: madeira ou perfil metálico (mutuamente exclusivo, paridade industrial). */
export type DrawerManufacturedSideMode = "wood" | "metal" | "none";

export function resolveDrawerManufacturedSideMode(
  metalBoxType: string | undefined | null,
  leftSideWidthMm: number
): DrawerManufacturedSideMode {
  if (isMetalBoxCatalogType(metalBoxType)) return "metal";
  if (leftSideWidthMm > 0) return "wood";
  return "none";
}

const HIDDEN_BRANDED_SLIDE_TYPES = new Set([
  "Blum Tandem",
  "Blum Movento",
  "Hettich InnoTech",
  "Hettich ArciTech",
]);

/**
 * Corrediças genéricas decorativas — apenas quando não há laterais fabricadas no viewer.
 * Evita duplicar laterais madeira/metal com perfis de corrediça.
 */
export function shouldRenderGenericDrawerSlideRails(
  slideType: string | undefined,
  sideMode: DrawerManufacturedSideMode
): boolean {
  if (sideMode !== "none") return false;
  return !HIDDEN_BRANDED_SLIDE_TYPES.has(slideType ?? "Genérica");
}

/** Paridade viewer ↔ XML industrial — laterais de madeira. */
export const DRAWER_VIEWER_SIDE_HEIGHT_RATIO = 0.75;
export const DRAWER_VIEWER_SIDE_BOTTOM_OFFSET_MM = 17;
export const DRAWER_VIEWER_SIDE_WALL_GAP_MM = 7;

export type DrawerViewerWoodSideLayoutMm = {
  sideHeightMm: number;
  sidePosYMm: number;
  leftPosXMm: number;
  rightPosXMm: number;
  bodyDepthMm: number;
  internalWidthMm: number;
};

/** Altura da lateral: 75% da frente (redução ~25%). */
export function resolveDrawerViewerSideHeightMm(frontHeightMm: number): number {
  const frontH = Math.max(0, Number(frontHeightMm));
  return Math.max(1, frontH * DRAWER_VIEWER_SIDE_HEIGHT_RATIO);
}

/** Largura interna útil da caixa a partir da largura do corpo (bodyWidth = interna − 2×folga). */
export function resolveDrawerViewerInternalWidthMm(
  bodyWidthMm: number,
  wallGapMm: number = DRAWER_VIEWER_SIDE_WALL_GAP_MM
): number {
  return Math.max(0, Number(bodyWidthMm)) + 2 * Math.max(0, wallGapMm);
}

/** Posição Y do centro da lateral (coords locais da gaveta, mm). */
export function resolveDrawerViewerSidePosYMm(
  frontPosYMm: number,
  frontHeightMm: number,
  sideHeightMm: number,
  bottomOffsetMm: number = DRAWER_VIEWER_SIDE_BOTTOM_OFFSET_MM
): number {
  return (
    Number(frontPosYMm) +
    Number(frontHeightMm) / 2 -
    Number(sideHeightMm) / 2 -
    Math.max(0, bottomOffsetMm)
  );
}

/** Posição X do centro da lateral (coords locais da gaveta, mm). */
export function resolveDrawerViewerSidePosXMm(
  internalWidthMm: number,
  sideThicknessMm: number,
  side: "left" | "right",
  wallGapMm: number = DRAWER_VIEWER_SIDE_WALL_GAP_MM
): number {
  const magnitude =
    Math.max(0, Number(internalWidthMm)) / 2 -
    Math.max(0, wallGapMm) -
    Math.max(0, Number(sideThicknessMm)) / 2;
  return side === "left" ? -magnitude : magnitude;
}

/** Posição Y do centro da frente alinhada à base industrial do gavetão (mm). */
export function resolveDrawerViewerFrontPosYMm(
  sidePosYMm: number,
  sideHeightMm: number,
  frontHeightMm: number,
  bottomOffsetMm: number = DRAWER_VIEWER_SIDE_BOTTOM_OFFSET_MM
): number {
  return (
    Number(sidePosYMm) +
    Number(sideHeightMm) / 2 -
    Number(frontHeightMm) / 2 +
    Math.max(0, bottomOffsetMm)
  );
}

/** Dimensões e posições viewer das laterais madeira (paridade XML). */
export function resolveDrawerViewerWoodSideLayoutMm(input: {
  frontPosYMm: number;
  frontHeightMm: number;
  bodyWidthMm: number;
  sideThicknessMm: number;
  bodyDepthMm: number;
}): DrawerViewerWoodSideLayoutMm {
  const sideHeightMm = resolveDrawerViewerSideHeightMm(input.frontHeightMm);
  const internalWidthMm = resolveDrawerViewerInternalWidthMm(input.bodyWidthMm);
  return {
    sideHeightMm,
    sidePosYMm: resolveDrawerViewerSidePosYMm(
      input.frontPosYMm,
      input.frontHeightMm,
      sideHeightMm
    ),
    leftPosXMm: resolveDrawerViewerSidePosXMm(
      internalWidthMm,
      input.sideThicknessMm,
      "left"
    ),
    rightPosXMm: resolveDrawerViewerSidePosXMm(
      internalWidthMm,
      input.sideThicknessMm,
      "right"
    ),
    bodyDepthMm: Math.max(0, Number(input.bodyDepthMm)),
    internalWidthMm,
  };
}

/** Paridade viewer ↔ XML industrial — fundo (gav_fun) e costa (gav_cost). */
export const DRAWER_VIEWER_FLOOR_ABOVE_SIDE_BASE_MM = 12;
export const DRAWER_VIEWER_FLOOR_INTERNAL_WIDTH_TRIM_MM = 14;

export type DrawerViewerWoodBottomBackLayoutMm = {
  floorWidthMm: number;
  floorDepthMm: number;
  floorThicknessMm: number;
  floorPosYMm: number;
  floorPosZMm: number;
  backWidthMm: number;
  backHeightMm: number;
  backThicknessMm: number;
  backPosYMm: number;
  backPosZMm: number;
};

/** Largura do fundo/costa: internalWidth − 14 mm − (espessuraLateral × 2). */
export function resolveDrawerViewerFloorWidthMm(
  internalWidthMm: number,
  sideThicknessMm: number
): number {
  return Math.max(
    1,
    Number(internalWidthMm) -
      DRAWER_VIEWER_FLOOR_INTERNAL_WIDTH_TRIM_MM -
      2 * Math.max(0, Number(sideThicknessMm))
  );
}

export function resolveDrawerViewerWoodBottomBackLayoutMm(input: {
  sidePosYMm: number;
  sideHeightMm: number;
  internalWidthMm: number;
  sideThicknessMm: number;
  bodyDepthMm: number;
  bodyCenterLocalZMm: number;
  floorThicknessMm: number;
  backThicknessMm: number;
}): DrawerViewerWoodBottomBackLayoutMm {
  const sideY = Number(input.sidePosYMm);
  const sideH = Math.max(0, Number(input.sideHeightMm));
  const floorT = Math.max(0, Number(input.floorThicknessMm));
  const backT = Math.max(0, Number(input.backThicknessMm));
  const bodyDepth = Math.max(0, Number(input.bodyDepthMm));
  const bodyCenterZ = Number(input.bodyCenterLocalZMm);
  const floorWidth = resolveDrawerViewerFloorWidthMm(
    input.internalWidthMm,
    input.sideThicknessMm
  );
  const floorPosY =
    sideY - sideH / 2 + DRAWER_VIEWER_FLOOR_ABOVE_SIDE_BASE_MM + floorT / 2;
  const backHeight = Math.max(
    1,
    sideH - DRAWER_VIEWER_FLOOR_ABOVE_SIDE_BASE_MM - floorT
  );
  const backPosY = sideY + sideH / 2 - backHeight / 2;
  const backPosZ = bodyCenterZ - bodyDepth / 2 + backT / 2;

  return {
    floorWidthMm: floorWidth,
    floorDepthMm: bodyDepth,
    floorThicknessMm: floorT,
    floorPosYMm: floorPosY,
    floorPosZMm: bodyCenterZ,
    backWidthMm: floorWidth,
    backHeightMm: backHeight,
    backThicknessMm: backT,
    backPosYMm: backPosY,
    backPosZMm: backPosZ,
  };
}

/** Compensação viewer quando carcaça usa P útil ≠ P externa (igual às portas). */
export function resolveDrawerViewerPosZAdjustmentMm(
  profundidadeExternaMm: number,
  profundidadeInternaUtilMm: number
): number {
  return (profundidadeInternaUtilMm - profundidadeExternaMm) / 2;
}

/** Posições flush no sistema local da caixa (mm). Origem = centro da caixa. */
export type DrawerFrontFlushLayoutMm = {
  frontOuterZ: number;
  frontPosZ: number;
  bodyCenterZ: number;
  bodyDepthMm: number;
  /** Relativo ao centro da frente (frontOffsetZ = 0). */
  bodyCenterLocalZ: number;
};

/**
 * Frente flush com a face frontal externa; corpo imediatamente atrás da frente.
 * bodyDepthMm = profundidadeUtil − folgaCorredica
 * bodyCenterZ = frontPosZ − espFrente/2 − bodyDepth/2
 */
export function resolveDrawerFrontFlushLayoutMm(
  profundidadeExternaMm: number,
  profundidadeUtilMm: number,
  frontThicknessMm: number,
  folgaCorredicaMm: number
): DrawerFrontFlushLayoutMm {
  const frontOuterZ = resolveDrawerFrontOuterZMm(profundidadeExternaMm);
  const frontPosZ = resolveDrawerFrontPosZMm(profundidadeExternaMm, frontThicknessMm);
  const bodyDepthMm = resolveDrawerViewerBodyDepthMm(profundidadeUtilMm, folgaCorredicaMm);
  const bodyCenterZ = resolveDrawerBodyCenterZFromFrontMm(frontPosZ, frontThicknessMm, bodyDepthMm);
  return {
    frontOuterZ,
    frontPosZ,
    bodyCenterZ,
    bodyDepthMm,
    bodyCenterLocalZ: bodyCenterZ - frontPosZ,
  };
}

function boxFromCenter(
  name: string,
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number
): DrawerViewerPieceBox {
  return {
    name,
    minX: cx - sx / 2,
    maxX: cx + sx / 2,
    minY: cy - sy / 2,
    maxY: cy + sy / 2,
    minZ: cz - sz / 2,
    maxZ: cz + sz / 2,
  };
}

export function boxesOverlap(a: DrawerViewerPieceBox, b: DrawerViewerPieceBox, epsilon = 0.05): boolean {
  return !(
    a.maxX <= b.minX + epsilon ||
    b.maxX <= a.minX + epsilon ||
    a.maxY <= b.minY + epsilon ||
    b.maxY <= a.minY + epsilon ||
    a.maxZ <= b.minZ + epsilon ||
    b.maxZ <= a.minZ + epsilon
  );
}

/** Caixas axis-aligned das peças madeira (mm) para validação de intersecção. */
export function buildDrawerWoodViewerPieceBoxes(input: {
  frontWidthMm: number;
  frontHeightMm: number;
  frontThicknessMm: number;
  bodyWidthMm: number;
  slideLengthMm: number;
  sideThicknessMm: number;
  woodBodyHeightMm: number;
  bottomThicknessMm: number;
  backThicknessMm: number;
  backWidthMm: number;
  deltaMm?: number;
}): DrawerViewerPieceBox[] {
  const delta = input.deltaMm ?? DRAWER_BODY_HEIGHT_BELOW_FRONT_MM;
  const woodH = input.woodBodyHeightMm;
  const offsetY = resolveDrawerBodyCenterOffsetYMm(delta);
  const combinedFront = input.frontThicknessMm;
  const bodyZ = resolveDrawerBodyCenterZMm(combinedFront, input.slideLengthMm);
  const backZ = resolveDrawerBackCenterZMm(combinedFront, input.slideLengthMm, input.backThicknessMm);
  const bottomY = resolveDrawerBottomCenterYMm(woodH, input.bottomThicknessMm, offsetY);
  const halfW = input.bodyWidthMm / 2;

  return [
    boxFromCenter("frente_ext", 0, 0, 0, input.frontWidthMm, input.frontHeightMm, input.frontThicknessMm),
    boxFromCenter(
      "lat_esq",
      -halfW + input.sideThicknessMm / 2,
      offsetY,
      bodyZ,
      input.sideThicknessMm,
      woodH,
      input.slideLengthMm
    ),
    boxFromCenter(
      "lat_dir",
      halfW - input.sideThicknessMm / 2,
      offsetY,
      bodyZ,
      input.sideThicknessMm,
      woodH,
      input.slideLengthMm
    ),
    boxFromCenter("fundo", 0, bottomY, bodyZ, input.backWidthMm, input.bottomThicknessMm, input.slideLengthMm),
    boxFromCenter("costa", 0, offsetY, backZ, input.backWidthMm, woodH, input.backThicknessMm),
  ];
}

export function assertDrawerWoodPiecesDisjoint(boxes: DrawerViewerPieceBox[]): string | null {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxesOverlap(boxes[i]!, boxes[j]!)) {
        return `${boxes[i]!.name} intersecta ${boxes[j]!.name}`;
      }
    }
  }
  return null;
}
