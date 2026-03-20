import type { CutPlacement, SheetDefinition } from "../cutLayoutTypes";

type PlacedRect = { x: number; y: number; w: number; h: number };

export type SheetAdvancedMetrics = {
  convexHullWaste: number;
  fragmentationScore: number;
  pocketsCount: number;
  linearGapScore: number;
  compactnessScore: number;
  usefulRectangularScrapScore: number;
};

export function computeSheetAdvancedMetrics(
  sheet: SheetDefinition,
  placements: CutPlacement[],
  deps: {
    rectArea: (r: PlacedRect) => number;
    rectIntersectArea: (a: PlacedRect, b: PlacedRect) => number;
    monotonicHull: (points: Array<{ x: number; y: number }>) => Array<{ x: number; y: number }>;
    polygonArea: (poly: Array<{ x: number; y: number }>) => number;
  }
): SheetAdvancedMetrics {
  if (placements.length === 0) {
    return {
      convexHullWaste: 0,
      fragmentationScore: 0,
      pocketsCount: 0,
      linearGapScore: 0,
      compactnessScore: 0,
      usefulRectangularScrapScore: 0,
    };
  }

  const rects: PlacedRect[] = placements.map((p) => ({ x: p.x_mm, y: p.y_mm, w: p.largura_mm, h: p.altura_mm }));
  const usedArea = rects.reduce((acc, r) => acc + deps.rectArea(r), 0);
  const sheetArea = Math.max(1, sheet.largura_mm * sheet.altura_mm);

  const pts: Array<{ x: number; y: number }> = [];
  for (const r of rects) {
    pts.push({ x: r.x, y: r.y });
    pts.push({ x: r.x + r.w, y: r.y });
    pts.push({ x: r.x + r.w, y: r.y + r.h });
    pts.push({ x: r.x, y: r.y + r.h });
  }
  const hull = deps.monotonicHull(pts);
  const hullArea = Math.max(usedArea, deps.polygonArea(hull));
  const convexHullWaste = Math.max(0, hullArea - usedArea);

  const grid = 48;
  const cellW = sheet.largura_mm / grid;
  const cellH = sheet.altura_mm / grid;
  const occ: boolean[][] = Array.from({ length: grid }, () => Array.from({ length: grid }, () => false));
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const cell: PlacedRect = { x: gx * cellW, y: gy * cellH, w: cellW, h: cellH };
      let covered = false;
      for (const r of rects) {
        if (deps.rectIntersectArea(cell, r) > cellW * cellH * 0.35) {
          covered = true;
          break;
        }
      }
      occ[gy][gx] = covered;
    }
  }

  let transitions = 0;
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid - 1; gx++) transitions += occ[gy][gx] === occ[gy][gx + 1] ? 0 : 1;
  }
  for (let gx = 0; gx < grid; gx++) {
    for (let gy = 0; gy < grid - 1; gy++) transitions += occ[gy][gx] === occ[gy + 1][gx] ? 0 : 1;
  }
  const fragmentationScore = transitions / (grid * grid);

  const visited: boolean[][] = Array.from({ length: grid }, () => Array.from({ length: grid }, () => false));
  let pocketsCount = 0;
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      if (visited[gy][gx] || occ[gy][gx]) continue;
      const queue: Array<[number, number]> = [[gx, gy]];
      visited[gy][gx] = true;
      let touchesBorder = gx === 0 || gy === 0 || gx === grid - 1 || gy === grid - 1;
      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        const nbs: Array<[number, number]> = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];
        for (const [nx, ny] of nbs) {
          if (nx < 0 || ny < 0 || nx >= grid || ny >= grid) continue;
          if (visited[ny][nx] || occ[ny][nx]) continue;
          visited[ny][nx] = true;
          if (nx === 0 || ny === 0 || nx === grid - 1 || ny === grid - 1) touchesBorder = true;
          queue.push([nx, ny]);
        }
      }
      if (!touchesBorder) pocketsCount++;
    }
  }

  let linearGapScore = 0;
  for (let gy = 0; gy < grid; gy++) {
    let run = 0;
    for (let gx = 0; gx < grid; gx++) {
      if (!occ[gy][gx]) run++;
      else run = 0;
      if (run >= 8) linearGapScore += run * 0.02;
    }
  }
  for (let gx = 0; gx < grid; gx++) {
    let run = 0;
    for (let gy = 0; gy < grid; gy++) {
      if (!occ[gy][gx]) run++;
      else run = 0;
      if (run >= 8) linearGapScore += run * 0.02;
    }
  }

  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.w));
  const maxY = Math.max(...rects.map((r) => r.y + r.h));
  const bboxArea = Math.max(1, (maxX - minX) * (maxY - minY));
  const compactnessScore = usedArea / bboxArea;

  const rightStrip = Math.max(0, sheet.largura_mm - maxX) * sheet.altura_mm;
  const topStrip = Math.max(0, sheet.altura_mm - maxY) * sheet.largura_mm;
  const shortPenalty = Math.min(rightStrip, topStrip) * 0.35;
  const usefulRectangularScrapScore = Math.max(0, Math.max(rightStrip, topStrip) - shortPenalty) / sheetArea;

  return {
    convexHullWaste: convexHullWaste / sheetArea,
    fragmentationScore,
    pocketsCount,
    linearGapScore,
    compactnessScore,
    usefulRectangularScrapScore,
  };
}
