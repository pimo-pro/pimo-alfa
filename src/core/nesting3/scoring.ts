import type { Nesting3Placement, Nesting3Score, Nesting3Sheet, Nesting3StrategyResult } from "./nesting3Types";

function usedArea(placements: Nesting3Placement[]): number {
  return placements.reduce((sum, p) => sum + p.widthMm * p.heightMm, 0);
}

function sheetsArea(sheets: Nesting3Sheet[], sheetsUsed: number): number {
  const fallback = sheets[0] ?? { widthMm: 2800, heightMm: 2070 };
  let total = 0;
  for (let i = 0; i < sheetsUsed; i++) {
    const sheet = sheets[i] ?? fallback;
    total += sheet.widthMm * sheet.heightMm;
  }
  return Math.max(1, total);
}

function estimateInternalHolePenalty(placements: Nesting3Placement[]): number {
  const bySheet = new Map<number, Nesting3Placement[]>();
  placements.forEach((p) => bySheet.set(p.sheetIndex, [...(bySheet.get(p.sheetIndex) ?? []), p]));
  let holes = 0;
  bySheet.forEach((items) => {
    const maxX = Math.max(0, ...items.map((p) => p.xMm + p.widthMm));
    const maxY = Math.max(0, ...items.map((p) => p.yMm + p.heightMm));
    const bboxArea = maxX * maxY;
    const fill = usedArea(items);
    if (bboxArea > 0) holes += Math.max(0, 1 - fill / bboxArea);
  });
  return Math.min(1, holes / Math.max(1, bySheet.size));
}

export function scoreNestingResult(
  result: Nesting3StrategyResult,
  sheets: Nesting3Sheet[],
  timeNormalizationMs = 250
): Nesting3Score {
  const area = sheetsArea(sheets, Math.max(1, result.sheetsUsed));
  const fillDensity = Math.min(1, usedArea(result.placements) / area);
  const wasteRatio = 1 - fillDensity;
  const internalHolePenalty = estimateInternalHolePenalty(result.placements);
  const normalizedTime = Math.max(0, 1 - result.elapsedMs / Math.max(1, timeNormalizationMs));
  const score =
    (1 - wasteRatio) * 0.6 +
    fillDensity * 0.2 +
    (1 - internalHolePenalty) * 0.1 +
    normalizedTime * 0.1;
  return {
    score,
    wasteRatio,
    fillDensity,
    internalHolePenalty,
    normalizedTime,
    quality: wasteRatio < 0.12 ? "excellent" : wasteRatio <= 0.2 ? "good" : "needs-repack",
  };
}
