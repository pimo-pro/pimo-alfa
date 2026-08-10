/**
 * Validação de posicionamento manual — margens, limites e sobreposição.
 */

import type { V4Piece, V4Placement, V4Sheet } from "./nestingV4Types";
import type { NestingV4Settings } from "./nestingV4Settings";
import { hasOverlap } from "./nestingV4Engine";

export function effectiveDims(piece: V4Piece): { w: number; h: number } {
  const rotated = piece.rotation === 90 || piece.rotation === 270;
  return rotated
    ? { w: piece.heightMm, h: piece.widthMm }
    : { w: piece.widthMm, h: piece.heightMm };
}

export function clampToSheet(
  xMm: number,
  yMm: number,
  w: number,
  h: number,
  sheet: V4Sheet,
  marginMm: number
): { xMm: number; yMm: number } {
  const minX = marginMm;
  const minY = marginMm;
  const maxX = sheet.widthMm - marginMm - w;
  const maxY = sheet.heightMm - marginMm - h;
  if (maxX < minX || maxY < minY) return { xMm: minX, yMm: minY };
  return {
    xMm: Math.max(minX, Math.min(maxX, xMm)),
    yMm: Math.max(minY, Math.min(maxY, yMm)),
  };
}

export function isPlacementValid(
  pieceId: string,
  sheetIndex: number,
  xMm: number,
  yMm: number,
  piece: V4Piece,
  sheet: V4Sheet,
  placements: V4Placement[],
  pieces: V4Piece[],
  settings: NestingV4Settings
): boolean {
  const { w, h } = effectiveDims(piece);
  const margin = settings.marginMm;
  if (xMm < margin - 0.01 || yMm < margin - 0.01) return false;
  if (xMm + w > sheet.widthMm - margin + 0.01) return false;
  if (yMm + h > sheet.heightMm - margin + 0.01) return false;

  const candidate: V4Placement = { pieceId, sheetIndex, xMm, yMm };
  const others = placements
    .filter((p) => p.pieceId !== pieceId && p.sheetIndex === sheetIndex)
    .map((pl) => {
      const p = pieces.find((pc) => pc.id === pl.pieceId);
      if (!p) return null;
      const dims = effectiveDims(p);
      return { pl, w: dims.w, h: dims.h };
    })
    .filter((x): x is { pl: V4Placement; w: number; h: number } => x != null);

  return !hasOverlap(candidate, w, h, others, settings.kerfMm);
}

export function findValidPlacement(
  pieceId: string,
  sheetIndex: number,
  preferredX: number,
  preferredY: number,
  piece: V4Piece,
  sheet: V4Sheet,
  placements: V4Placement[],
  pieces: V4Piece[],
  settings: NestingV4Settings
): { xMm: number; yMm: number } | null {
  const { w, h } = effectiveDims(piece);
  const clamped = clampToSheet(preferredX, preferredY, w, h, sheet, settings.marginMm);
  if (isPlacementValid(pieceId, sheetIndex, clamped.xMm, clamped.yMm, piece, sheet, placements, pieces, settings)) {
    return clamped;
  }

  const step = Math.max(5, settings.kerfMm);
  for (let radius = step; radius <= Math.max(sheet.widthMm, sheet.heightMm); radius += step) {
    for (let dx = -radius; dx <= radius; dx += step) {
      for (let dy = -radius; dy <= radius; dy += step) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        const pos = clampToSheet(clamped.xMm + dx, clamped.yMm + dy, w, h, sheet, settings.marginMm);
        if (isPlacementValid(pieceId, sheetIndex, pos.xMm, pos.yMm, piece, sheet, placements, pieces, settings)) {
          return pos;
        }
      }
    }
  }
  return null;
}
