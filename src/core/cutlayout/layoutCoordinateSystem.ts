import { getSettings } from "../settings/settingsService";

export const CUT_LAYOUT_SAFETY_MARGIN_MM = 5;

export type LayoutXOrigin = "left" | "right";

export const CUT_LAYOUT_X_ORIGIN: LayoutXOrigin = "right";

export function toLayoutAbsoluteX(xAbsMm: number, sheetWidthMm: number): number {
  if (CUT_LAYOUT_X_ORIGIN === "right") {
    return sheetWidthMm - xAbsMm;
  }
  return xAbsMm;
}

export function toLayoutPlacementX(xMm: number, widthMm: number, sheetWidthMm: number): number {
  if (CUT_LAYOUT_X_ORIGIN === "right") {
    return sheetWidthMm - (xMm + widthMm);
  }
  return xMm;
}

/**
 * Converte (hx, hy) no espaço da peça (origem canto inferior-esquerdo da peça na cutlist,
 * X ao longo da largura, Y ao longo da altura) para offset no retângulo de colocação na chapa
 * (origem canto inferior-esquerdo do placement), com rotação 0 ou 90° do nesting.
 */
export function holeLocalToSheetOffsetMm(
  hx: number,
  hy: number,
  rotacaoDeg: number,
  pieceLarguraMm?: number,
  pieceAlturaMm?: number
): { sx: number; sy: number } {
  const r = ((rotacaoDeg ?? 0) % 360 + 360) % 360;
  if (r === 90) {
    // 90° CCW: piece X→sheet Y, piece Y→sheet X (mirrored)
    const L = pieceLarguraMm ?? 0;
    void pieceAlturaMm;
    return { sx: hy, sy: L - hx };
  }
  return { sx: hx, sy: hy };
}

export function getSheetSafetyMarginMm(): number {
  try {
    const s = getSettings();
    return s?.cnc?.sheetMarginMm ?? CUT_LAYOUT_SAFETY_MARGIN_MM;
  } catch {
    return CUT_LAYOUT_SAFETY_MARGIN_MM;
  }
}
