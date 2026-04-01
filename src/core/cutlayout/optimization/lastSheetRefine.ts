import type { CutPlacement, SheetDefinition, SheetResult } from "../cutLayoutTypes";

type PlacedRect = { x: number; y: number; w: number; h: number };
type ScoreModel = "legacy" | "v32";

const EPS = 0.001;
const LAST_SHEET_SMALL_PART_THRESHOLD_MM2 = 200000; // ~447x447 — mais peças elegíveis para mover da última chapa
const LAST_SHEET_MICRO_ADJUST_MM = 3;

export type LastSheetRefineDeps = {
  getSheetBoundingBox: (_placements: CutPlacement[]) => {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    area: number;
  };
  isInsideSheet: (_x: number, _y: number, _w: number, _h: number, _sheet: SheetDefinition) => boolean;
  overlaps: (_x: number, _y: number, _w: number, _h: number, _placed: PlacedRect[], _kerf: number) => boolean;
  findBestResidualPlacement: (
    _target: CutPlacement,
    _existing: CutPlacement[],
    _sheet: SheetDefinition,
    _kerf: number
  ) => CutPlacement | null;
  computePlacementCompactnessScore: (
    _x: number,
    _y: number,
    _w: number,
    _h: number,
    _sheet: SheetDefinition
  ) => number;
  cloneSheets: (_sheets: SheetResult[]) => SheetResult[];
  computeSolutionMetrics: (_sheets: SheetResult[], _sheet: SheetDefinition, _scoreModel: ScoreModel) => { score: number };
};

export function tryMicroAdjustLastSheet(
  placements: CutPlacement[],
  sheet: SheetDefinition,
  deps: Pick<LastSheetRefineDeps, "getSheetBoundingBox" | "isInsideSheet" | "overlaps">
): CutPlacement[] {
  if (placements.length <= 1) return placements;
  const adjusted = placements.map((p) => ({ ...p }));
  const offsets = [-LAST_SHEET_MICRO_ADJUST_MM, -2, -1, 1, 2, LAST_SHEET_MICRO_ADJUST_MM];
  const startBox = deps.getSheetBoundingBox(adjusted);
  let currentScore = -startBox.area;
  for (let i = 0; i < adjusted.length; i++) {
    const p = adjusted[i];
    let bestX = p.x_mm;
    let bestY = p.y_mm;
    let bestScore = currentScore;
    for (const dx of offsets) {
      for (const dy of offsets) {
        const nx = p.x_mm + dx;
        const ny = p.y_mm + dy;
        if (!deps.isInsideSheet(nx, ny, p.largura_mm, p.altura_mm, sheet)) continue;
        const others: PlacedRect[] = adjusted
          .filter((_, idx) => idx !== i)
          .map((o) => ({ x: o.x_mm, y: o.y_mm, w: o.largura_mm, h: o.altura_mm }));
        if (deps.overlaps(nx, ny, p.largura_mm, p.altura_mm, others, 0)) continue;
        const trial = adjusted.map((o, idx) => (idx === i ? { ...o, x_mm: nx, y_mm: ny } : o));
        const box = deps.getSheetBoundingBox(trial);
        const score = -box.area;
        if (score > bestScore) {
          bestScore = score;
          bestX = nx;
          bestY = ny;
        }
      }
    }
    if (bestX !== p.x_mm || bestY !== p.y_mm) {
      adjusted[i] = { ...adjusted[i], x_mm: bestX, y_mm: bestY };
      currentScore = bestScore;
    }
  }
  return adjusted;
}

export function tryLocalRotationRefine(
  placements: CutPlacement[],
  sheet: SheetDefinition,
  kerf: number,
  deps: Pick<LastSheetRefineDeps, "findBestResidualPlacement" | "computePlacementCompactnessScore">
): CutPlacement[] {
  if (placements.length <= 1) return placements;
  const refined = placements.map((p) => ({ ...p }));
  for (let i = 0; i < refined.length; i++) {
    const p = refined[i];
    if (Math.abs(p.largura_mm - p.altura_mm) < EPS) continue;
    const others = refined.filter((_, idx) => idx !== i).map((o) => ({ ...o }));
    const rotatedCandidate = deps.findBestResidualPlacement(
      {
        ...p,
        largura_mm: p.altura_mm,
        altura_mm: p.largura_mm,
        rotacao: p.rotacao === 90 ? 0 : 90,
      },
      others,
      sheet,
      kerf
    );
    if (!rotatedCandidate) continue;
    const oldScore = deps.computePlacementCompactnessScore(p.x_mm, p.y_mm, p.largura_mm, p.altura_mm, sheet);
    const newScore = deps.computePlacementCompactnessScore(
      rotatedCandidate.x_mm,
      rotatedCandidate.y_mm,
      rotatedCandidate.largura_mm,
      rotatedCandidate.altura_mm,
      sheet
    );
    if (newScore > oldScore) refined[i] = rotatedCandidate;
  }
  return refined;
}

export function trySwapSmallPieceToPrevious(
  previous: SheetResult[],
  lastPlacements: CutPlacement[],
  sheet: SheetDefinition,
  kerf: number,
  deps: Pick<LastSheetRefineDeps, "findBestResidualPlacement">
): { moved: boolean; lastPlacements: CutPlacement[] } {
  const smallLast = [...lastPlacements]
    .filter((p) => p.largura_mm * p.altura_mm <= LAST_SHEET_SMALL_PART_THRESHOLD_MM2)
    .sort((a, b) => a.largura_mm * a.altura_mm - b.largura_mm * b.altura_mm);

  for (const target of smallLast) {
    for (let sIdx = 0; sIdx < previous.length; sIdx++) {
      const sheetRes = previous[sIdx];
      const candidates = [...sheetRes.placements]
        .sort((a, b) => a.largura_mm * a.altura_mm - b.largura_mm * b.altura_mm)
        .slice(0, 10);
      for (const victim of candidates) {
        const kept = sheetRes.placements.filter((p) => p !== victim);
        const fitTarget = deps.findBestResidualPlacement(target, kept, sheet, kerf);
        if (!fitTarget) continue;
        const nextLastBase = lastPlacements.filter((p) => p !== target);
        const fitVictimInLast = deps.findBestResidualPlacement(victim, nextLastBase, sheet, kerf);
        if (!fitVictimInLast) continue;
        sheetRes.placements = [...kept, { ...fitTarget, sheetIndex: sIdx }];
        return {
          moved: true,
          lastPlacements: [...nextLastBase, { ...fitVictimInLast, sheetIndex: previous.length }],
        };
      }
    }
  }

  return { moved: false, lastPlacements };
}

export function optimizeLastSheetLocally(
  sheets: SheetResult[],
  sheet: SheetDefinition,
  kerf: number,
  scoreModel: ScoreModel,
  deps: LastSheetRefineDeps
): SheetResult[] {
  if (sheets.length <= 1) return sheets;
  const cloned = deps.cloneSheets(sheets);
  const lastIndex = cloned.length - 1;
  const last = cloned[lastIndex];
  const previous = cloned.slice(0, lastIndex);
  if (last.placements.length === 0) return cloned;

  const movable = [...last.placements].sort(
    (a, b) => a.largura_mm * a.altura_mm - b.largura_mm * b.altura_mm
  );
  const remain = new Set(last.placements.map((_p, i) => i));
  const movedToPrev: CutPlacement[] = [];

  for (const piece of movable) {
    const area = piece.largura_mm * piece.altura_mm;
    if (area > LAST_SHEET_SMALL_PART_THRESHOLD_MM2) continue;
    let moved = false;
    for (let sIdx = 0; sIdx < previous.length; sIdx++) {
      const targetSheet = previous[sIdx];
      const fit = deps.findBestResidualPlacement(piece, targetSheet.placements, sheet, kerf);
      if (!fit) continue;
      targetSheet.placements.push({ ...fit, sheetIndex: sIdx });
      movedToPrev.push(piece);
      moved = true;
      break;
    }
    if (moved) {
      const idx = last.placements.findIndex((p) => p === piece);
      if (idx >= 0) remain.delete(idx);
    }
  }

  if (movedToPrev.length === 0) return cloned;
  let nextLastPlacements = last.placements.filter((_p, idx) => remain.has(idx));
  const swapAttempt = trySwapSmallPieceToPrevious(previous, nextLastPlacements, sheet, kerf, deps);
  if (swapAttempt.moved) nextLastPlacements = swapAttempt.lastPlacements;
  nextLastPlacements = tryLocalRotationRefine(nextLastPlacements, sheet, kerf, deps);
  nextLastPlacements = tryMicroAdjustLastSheet(nextLastPlacements, sheet, deps);
  if (nextLastPlacements.length === 0) {
    const compact = previous.map((s, idx) => ({
      sheet: { ...s.sheet },
      placements: s.placements.map((p) => ({ ...p, sheetIndex: idx })),
    }));
    return compact;
  }

  const baseMetrics = deps.computeSolutionMetrics(cloned, sheet, scoreModel);
  const candidateSheets = [
    ...previous.map((s, idx) => ({
      sheet: { ...s.sheet },
      placements: s.placements.map((p) => ({ ...p, sheetIndex: idx })),
    })),
    {
      sheet: { ...sheet },
      placements: nextLastPlacements.map((p) => ({ ...p, sheetIndex: previous.length })),
    },
  ];
  const candidateMetrics = deps.computeSolutionMetrics(candidateSheets, sheet, scoreModel);
  return candidateMetrics.score <= baseMetrics.score ? candidateSheets : cloned;
}
