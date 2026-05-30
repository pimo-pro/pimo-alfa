import type { Nesting3Options, Nesting3Piece, Nesting3Placement, Nesting3Sheet, Nesting3StrategyResult } from "./nesting3Types";

function orientations(piece: Nesting3Piece) {
  const base = [{ widthMm: piece.widthMm, heightMm: piece.heightMm, rotated: false }];
  if (!piece.allowRotation || piece.widthMm === piece.heightMm) return base;
  return [...base, { widthMm: piece.heightMm, heightMm: piece.widthMm, rotated: true }];
}

function overlaps(x: number, y: number, w: number, h: number, placed: Nesting3Placement[], kerfMm: number): boolean {
  return placed.some((p) => {
    const overlapX = x < p.xMm + p.widthMm + kerfMm && p.xMm < x + w + kerfMm;
    const overlapY = y < p.yMm + p.heightMm + kerfMm && p.yMm < y + h + kerfMm;
    return overlapX && overlapY;
  });
}

function candidates(placed: Nesting3Placement[]): Array<{ x: number; y: number }> {
  const points = [{ x: 0, y: 0 }];
  for (const p of placed) {
    points.push({ x: p.xMm + p.widthMm, y: p.yMm });
    points.push({ x: p.xMm, y: p.yMm + p.heightMm });
  }
  return points.sort((a, b) => a.y - b.y || a.x - b.x);
}

export function runStrategyFFD(
  pieces: Nesting3Piece[],
  sheets: Nesting3Sheet[],
  options: Nesting3Options
): Nesting3StrategyResult {
  const started = performance.now();
  const template = sheets[0] ?? { index: 0, widthMm: 2800, heightMm: 2070, thicknessMm: 19 };
  const activeSheets = [...sheets];
  const placements: Nesting3Placement[] = [];
  const unplacedPieceIds: string[] = [];
  const maxSheets = Math.max(1, sheets.length + (options.maxExtraSheets ?? 10));

  for (const piece of pieces) {
    let placed = false;
    while (activeSheets.length < maxSheets && !placed) {
      for (let sheetIndex = 0; sheetIndex < activeSheets.length; sheetIndex++) {
        const sheet = activeSheets[sheetIndex]!;
        const sheetPlacements = placements.filter((p) => p.sheetIndex === sheetIndex);
        for (const candidate of candidates(sheetPlacements)) {
          for (const o of orientations(piece)) {
            if (candidate.x + o.widthMm > sheet.widthMm || candidate.y + o.heightMm > sheet.heightMm) continue;
            if (overlaps(candidate.x, candidate.y, o.widthMm, o.heightMm, sheetPlacements, options.kerfMm)) continue;
            placements.push({
              pieceId: piece.id,
              sheetIndex,
              xMm: candidate.x,
              yMm: candidate.y,
              widthMm: o.widthMm,
              heightMm: o.heightMm,
              rotated: o.rotated,
            });
            placed = true;
            break;
          }
          if (placed) break;
        }
        if (placed) break;
      }
      if (!placed) {
        activeSheets.push({ ...template, index: activeSheets.length });
      }
    }
    if (!placed) unplacedPieceIds.push(piece.id);
  }

  return {
    strategy: "ffd",
    placements,
    unplacedPieceIds,
    sheetsUsed: placements.reduce((max, p) => Math.max(max, p.sheetIndex + 1), 0),
    elapsedMs: performance.now() - started,
  };
}
