import type { Nesting3Options, Nesting3Piece, Nesting3Placement, Nesting3Sheet, Nesting3StrategyResult } from "./nesting3Types";

type Shelf = { y: number; height: number; nextX: number };

function dims(piece: Nesting3Piece) {
  if (!piece.allowRotation || piece.widthMm >= piece.heightMm) {
    return { widthMm: piece.widthMm, heightMm: piece.heightMm, rotated: false };
  }
  return { widthMm: piece.heightMm, heightMm: piece.widthMm, rotated: true };
}

export function runStrategyShelf(
  pieces: Nesting3Piece[],
  sheets: Nesting3Sheet[],
  options: Nesting3Options
): Nesting3StrategyResult {
  const started = performance.now();
  const template = sheets[0] ?? { index: 0, widthMm: 2800, heightMm: 2070, thicknessMm: 19 };
  const activeSheets = [...sheets];
  const shelves: Shelf[][] = activeSheets.map(() => []);
  const placements: Nesting3Placement[] = [];
  const unplacedPieceIds: string[] = [];
  const maxSheets = Math.max(1, sheets.length + (options.maxExtraSheets ?? 10));

  for (const piece of pieces) {
    const d = dims(piece);
    let placed = false;
    while (activeSheets.length < maxSheets && !placed) {
      for (let sheetIndex = 0; sheetIndex < activeSheets.length; sheetIndex++) {
        const sheet = activeSheets[sheetIndex]!;
        let shelf = shelves[sheetIndex]!.find((s) => d.heightMm <= s.height && s.nextX + d.widthMm <= sheet.widthMm);
        if (!shelf) {
          const last = shelves[sheetIndex]![shelves[sheetIndex]!.length - 1];
          const y = last ? last.y + last.height + options.kerfMm : 0;
          if (y + d.heightMm <= sheet.heightMm) {
            shelf = { y, height: d.heightMm, nextX: 0 };
            shelves[sheetIndex]!.push(shelf);
          }
        }
        if (!shelf) continue;
        placements.push({
          pieceId: piece.id,
          sheetIndex,
          xMm: shelf.nextX,
          yMm: shelf.y,
          widthMm: d.widthMm,
          heightMm: d.heightMm,
          rotated: d.rotated,
        });
        shelf.nextX += d.widthMm + options.kerfMm;
        placed = true;
        break;
      }
      if (!placed) {
        activeSheets.push({ ...template, index: activeSheets.length });
        shelves.push([]);
      }
    }
    if (!placed) unplacedPieceIds.push(piece.id);
  }

  return {
    strategy: "shelf",
    placements,
    unplacedPieceIds,
    sheetsUsed: placements.reduce((max, p) => Math.max(max, p.sheetIndex + 1), 0),
    elapsedMs: performance.now() - started,
  };
}
