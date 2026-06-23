/**
 * Geometria 3D unificada das gavetas (Viewer).
 * Origem local do grupo da gaveta: centro da frente externa (X/Y/Z).
 * Z+ = para a frente do módulo; Y+ = para cima.
 */
import { DRAWER_BODY_HEIGHT_BELOW_FRONT_MM } from "./drawerGeometryConstants";

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

/** Centro Z do corpo (laterais/fundo) atrás da frente: −(esp. frente + slideLength)/2. */
export function resolveDrawerBodyCenterZMm(
  combinedFrontThicknessMm: number,
  slideLengthMm: number
): number {
  return -(combinedFrontThicknessMm / 2 + slideLengthMm / 2);
}

/** Centro Z da costa no fundo do corpo. */
export function resolveDrawerBackCenterZMm(
  combinedFrontThicknessMm: number,
  slideLengthMm: number,
  backThicknessMm: number
): number {
  return -(combinedFrontThicknessMm / 2 + slideLengthMm - backThicknessMm / 2);
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
 * Face frontal externa da frente flush com a face frontal da carcaça.
 */
export function resolveDrawerGroupPosZMm(
  layoutDepthMm: number,
  frontThicknessMm: number,
  carcassDepthMm?: number
): number {
  const frontFaceZ =
    carcassDepthMm != null && Number.isFinite(carcassDepthMm) && carcassDepthMm > 0
      ? carcassDepthMm / 2
      : layoutDepthMm / 2;
  return frontFaceZ - frontThicknessMm / 2;
}

/** Compensação viewer quando carcaça usa P útil ≠ P externa (igual às portas). */
export function resolveDrawerViewerPosZAdjustmentMm(
  profundidadeExternaMm: number,
  profundidadeInternaUtilMm: number
): number {
  return (profundidadeInternaUtilMm - profundidadeExternaMm) / 2;
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
