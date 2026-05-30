import type { Nesting3Options, Nesting3Piece, Nesting3Placement, Nesting3Sheet, Nesting3StrategyResult } from "./nesting3Types";

type SkylineSegment = { x: number; y: number; width: number };

function orientations(piece: Nesting3Piece) {
  const base = [{ widthMm: piece.widthMm, heightMm: piece.heightMm, rotated: false }];
  if (!piece.allowRotation || piece.widthMm === piece.heightMm) return base;
  return [...base, { widthMm: piece.heightMm, heightMm: piece.widthMm, rotated: true }];
}

function findSkylinePlacement(
  skyline: SkylineSegment[],
  sheet: Nesting3Sheet,
  widthMm: number,
  heightMm: number,
  kerfMm: number
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  for (const segment of skyline) {
    const x = segment.x;
    let remaining = widthMm + kerfMm;
    let y = segment.y;
    for (const next of skyline.filter((s) => s.x >= x).sort((a, b) => a.x - b.x)) {
      if (next.x > x + widthMm + kerfMm) break;
      y = Math.max(y, next.y);
      remaining -= next.width;
      if (remaining <= 0) break;
    }
    if (x + widthMm <= sheet.widthMm && y + heightMm <= sheet.heightMm) {
      if (!best || y < best.y || (y === best.y && x < best.x)) best = { x, y };
    }
  }
  return best;
}

function updateSkyline(
  skyline: SkylineSegment[],
  x: number,
  y: number,
  widthMm: number,
  heightMm: number,
  kerfMm: number
): SkylineSegment[] {
  const newTop = y + heightMm + kerfMm;
  const endX = x + widthMm + kerfMm;
  return skyline
    .flatMap((seg) => {
      const segEnd = seg.x + seg.width;
      if (segEnd <= x || seg.x >= endX) return [seg];
      const parts: SkylineSegment[] = [];
      if (seg.x < x) parts.push({ x: seg.x, y: seg.y, width: x - seg.x });
      if (segEnd > endX) parts.push({ x: endX, y: seg.y, width: segEnd - endX });
      return parts;
    })
    .concat({ x, y: newTop, width: widthMm + kerfMm })
    .filter((s) => s.width > 0)
    .sort((a, b) => a.x - b.x);
}

export function runStrategySkyline(
  pieces: Nesting3Piece[],
  sheets: Nesting3Sheet[],
  options: Nesting3Options
): Nesting3StrategyResult {
  const started = performance.now();
  const template = sheets[0] ?? { index: 0, widthMm: 2800, heightMm: 2070, thicknessMm: 19 };
  const activeSheets = [...sheets];
  const skylines: SkylineSegment[][] = activeSheets.map((s) => [{ x: 0, y: 0, width: s.widthMm }]);
  const placements: Nesting3Placement[] = [];
  const unplacedPieceIds: string[] = [];
  const maxSheets = Math.max(1, sheets.length + (options.maxExtraSheets ?? 10));

  for (const piece of pieces) {
    let placed = false;
    while (activeSheets.length < maxSheets && !placed) {
      for (let sheetIndex = 0; sheetIndex < activeSheets.length; sheetIndex++) {
        const sheet = activeSheets[sheetIndex]!;
        let best: { x: number; y: number; widthMm: number; heightMm: number; rotated: boolean } | null = null;
        for (const o of orientations(piece)) {
          const candidate = findSkylinePlacement(skylines[sheetIndex]!, sheet, o.widthMm, o.heightMm, options.kerfMm);
          if (!candidate) continue;
          const next = { ...candidate, ...o };
          if (!best || next.y < best.y || (next.y === best.y && next.x < best.x)) best = next;
        }
        if (!best) continue;
        placements.push({
          pieceId: piece.id,
          sheetIndex,
          xMm: best.x,
          yMm: best.y,
          widthMm: best.widthMm,
          heightMm: best.heightMm,
          rotated: best.rotated,
        });
        skylines[sheetIndex] = updateSkyline(skylines[sheetIndex]!, best.x, best.y, best.widthMm, best.heightMm, options.kerfMm);
        placed = true;
        break;
      }
      if (!placed) {
        activeSheets.push({ ...template, index: activeSheets.length });
        skylines.push([{ x: 0, y: 0, width: template.widthMm }]);
      }
    }
    if (!placed) unplacedPieceIds.push(piece.id);
  }

  return {
    strategy: "skyline",
    placements,
    unplacedPieceIds,
    sheetsUsed: placements.reduce((max, p) => Math.max(max, p.sheetIndex + 1), 0),
    elapsedMs: performance.now() - started,
  };
}
