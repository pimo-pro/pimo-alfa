/**
 * Conversão de referenciais de coordenadas — CutLayout (BL) ↔ Nesting V3 (TL).
 *
 * Frames:
 * - solver-usable: BL na área interna (physical − 2×margem)
 * - physical-bottom-left: BL na chapa física (pós finalizeIndustrialLayout)
 * - v3-canvas-top-left: TL no canvas V3
 *
 * Não altera normalizeSheetToTopRightOrigin / computeTcnReadyHoles.
 */

import type { CutPlacement } from "../cutLayoutTypes";
import type { V3Placement } from "../../../nesting-v3/nestingV3Types";

export type LayoutCoordinateFrame = "solver-usable" | "physical-bottom-left" | "v3-canvas-top-left";

const TOL_MM = 0.01;

export function physicalBlToV3TopLeft(
  blX: number,
  blY: number,
  pieceHeightMm: number,
  sheetHeightMm: number
): { xMm: number; yMm: number } {
  const h = Math.max(0, pieceHeightMm);
  return {
    xMm: blX,
    yMm: sheetHeightMm - blY - h,
  };
}

export function v3TopLeftToPhysicalBl(
  v3X: number,
  v3Y: number,
  pieceHeightMm: number,
  sheetHeightMm: number
): { x_mm: number; y_mm: number } {
  const h = Math.max(0, pieceHeightMm);
  return {
    x_mm: v3X,
    y_mm: sheetHeightMm - v3Y - h,
  };
}

export function solverUsableToPhysicalBl(
  usableX: number,
  usableY: number,
  marginMm: number
): { x_mm: number; y_mm: number } {
  return {
    x_mm: usableX + marginMm,
    y_mm: usableY + marginMm,
  };
}

export function physicalBlToSolverUsable(
  physicalX: number,
  physicalY: number,
  marginMm: number
): { x: number; y: number } {
  return {
    x: physicalX - marginMm,
    y: physicalY - marginMm,
  };
}

/** CutPlacement em BL físico (pós-margem) → V3Placement em TL canvas. */
export function cutPlacementToV3Placement(pl: CutPlacement, sheetHeightMm: number): V3Placement {
  const tl = physicalBlToV3TopLeft(pl.x_mm, pl.y_mm, pl.altura_mm, sheetHeightMm);
  return {
    pieceId: String(pl.metadata?.v3PieceId ?? ""),
    sheetIndex: pl.sheetIndex,
    xMm: tl.xMm,
    yMm: tl.yMm,
    rotated: pl.rotacao === 90 || pl.rotacao === 270,
  };
}

/** V3Placement TL + altura colocada → origem BL (x_mm, y_mm) do CutPlacement. */
export function v3PlacementToCutPlacement(
  pl: V3Placement,
  placedHeightMm: number,
  sheetHeightMm: number
): Pick<CutPlacement, "x_mm" | "y_mm"> {
  return v3TopLeftToPhysicalBl(pl.xMm, pl.yMm, placedHeightMm, sheetHeightMm);
}

export function coordinatesWithinTolerance(a: number, b: number, toleranceMm = TOL_MM): boolean {
  return Math.abs(a - b) <= toleranceMm;
}
