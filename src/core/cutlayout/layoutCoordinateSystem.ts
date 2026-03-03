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
