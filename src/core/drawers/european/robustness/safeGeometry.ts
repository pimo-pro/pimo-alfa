/**
 * safeGeometry.ts — Sanitiza geometria emitida (dims/origins finitos).
 */

import type { DrawerGeometry, DrawerPieceBox } from "../types";
import {
  ensureFiniteNumber,
  ensureNonNegative,
  robustDebug,
} from "./safeNumbers";

function sanitizePiece(piece: DrawerPieceBox, context: string): DrawerPieceBox {
  return {
    widthMm: ensureNonNegative(piece.widthMm, `${context}.widthMm`),
    heightMm: ensureNonNegative(piece.heightMm, `${context}.heightMm`),
    depthMm: ensureNonNegative(piece.depthMm, `${context}.depthMm`),
    thicknessMm: ensureNonNegative(piece.thicknessMm, `${context}.thicknessMm`),
    originXMm: ensureFiniteNumber(piece.originXMm, `${context}.originXMm`, 0),
    originYMm: ensureFiniteNumber(piece.originYMm, `${context}.originYMm`, 0),
    originZMm: ensureFiniteNumber(piece.originZMm, `${context}.originZMm`, 0),
  };
}

function pieceHasCriticalNaN(piece: DrawerPieceBox): boolean {
  return (
    !Number.isFinite(piece.widthMm) ||
    !Number.isFinite(piece.heightMm) ||
    !Number.isFinite(piece.depthMm) ||
    !Number.isFinite(piece.originXMm) ||
    !Number.isFinite(piece.originYMm) ||
    !Number.isFinite(piece.originZMm)
  );
}

/**
 * Sanitiza geometria completa. Peças com NaN residual após clamp são zeradas.
 */
export function sanitizeGeometry(geometry: DrawerGeometry): DrawerGeometry {
  const front = sanitizePiece(geometry.front, "geometry.front");
  const bottom = sanitizePiece(geometry.bottom, "geometry.bottom");
  const leftSide = sanitizePiece(geometry.leftSide, "geometry.leftSide");
  const rightSide = sanitizePiece(geometry.rightSide, "geometry.rightSide");
  const back = sanitizePiece(geometry.back, "geometry.back");
  const frontInt = geometry.frontInt
    ? sanitizePiece(geometry.frontInt, "geometry.frontInt")
    : undefined;

  for (const [name, p] of [
    ["front", front],
    ["bottom", bottom],
    ["leftSide", leftSide],
    ["rightSide", rightSide],
    ["back", back],
  ] as const) {
    if (pieceHasCriticalNaN(p)) {
      robustDebug("geometry", `peça ${name} ainda inválida após sanitize`, p);
    }
  }

  return {
    ...geometry,
    front,
    frontInt,
    bottom,
    leftSide,
    rightSide,
    back,
    externalWidthMm: ensureNonNegative(geometry.externalWidthMm, "geometry.externalWidthMm"),
    internalWidthMm: ensureNonNegative(geometry.internalWidthMm, "geometry.internalWidthMm"),
    usefulHeightMm: ensureNonNegative(geometry.usefulHeightMm, "geometry.usefulHeightMm"),
    runnerDepthMm: ensureNonNegative(geometry.runnerDepthMm, "geometry.runnerDepthMm"),
    bodyDepthMm: ensureNonNegative(geometry.bodyDepthMm, "geometry.bodyDepthMm"),
  };
}
