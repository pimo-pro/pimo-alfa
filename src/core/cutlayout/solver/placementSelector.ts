import type { CutPiece, SheetDefinition } from "../cutLayoutTypes";
import type { PlacementCandidate, RotationScoringConfig } from "../scoring/rotationScoring";

type PlacementStrategy = "skyline" | "shelf" | "guillotine";
type BinHeuristic = "firstFit" | "bestFit";
type PlacedRect = { x: number; y: number; w: number; h: number };

type SkylineSegment = { x: number; y: number };
type Shelf = { y: number; height: number; nextX: number };
type FreeRect = { x: number; y: number; w: number; h: number };
type StateSkyline = { skyline: SkylineSegment[] };
type StateShelf = { shelves: Shelf[] };
type StateGuillotine = { freeRects: FreeRect[] };
type StrategyState = StateSkyline | StateShelf | StateGuillotine;

export type CutLayoutStrategyPlacementDeps = {
  findPlacementSkyline: (
    piece: CutPiece,
    sheet: SheetDefinition,
    placed: PlacedRect[],
    state: StateSkyline,
    kerf: number,
    cfg: RotationScoringConfig,
    bin: BinHeuristic
  ) => PlacementCandidate | null;
  findPlacementShelf: (
    piece: CutPiece,
    sheet: SheetDefinition,
    placed: PlacedRect[],
    state: StateShelf,
    kerf: number,
    cfg: RotationScoringConfig,
    bin: BinHeuristic
  ) => PlacementCandidate | null;
  findPlacementGuillotine: (
    piece: CutPiece,
    sheet: SheetDefinition,
    placed: PlacedRect[],
    state: StateGuillotine,
    kerf: number,
    cfg: RotationScoringConfig,
    bin: BinHeuristic
  ) => PlacementCandidate | null;
};

export type CutLayoutPlacementSelectorDeps = CutLayoutStrategyPlacementDeps & {
  calculateSheetUtilization: (placedRects: PlacedRect[], sheetW: number, sheetH: number) => number;
  scorePlacement: (
    sheet: SheetDefinition,
    placement: PlacementCandidate,
    currentUtilization: number,
    rotationCfg: RotationScoringConfig
  ) => number;
};

export function findPlacementForPiece(
  piece: CutPiece,
  strategy: PlacementStrategy,
  sheet: SheetDefinition,
  placedRects: PlacedRect[],
  state: StrategyState,
  kerf: number,
  rotationCfg: RotationScoringConfig,
  bin: BinHeuristic,
  deps: CutLayoutStrategyPlacementDeps
): PlacementCandidate | null {
  if (strategy === "skyline") {
    return deps.findPlacementSkyline(piece, sheet, placedRects, state as StateSkyline, kerf, rotationCfg, bin);
  }
  if (strategy === "shelf") {
    return deps.findPlacementShelf(piece, sheet, placedRects, state as StateShelf, kerf, rotationCfg, bin);
  }
  return deps.findPlacementGuillotine(piece, sheet, placedRects, state as StateGuillotine, kerf, rotationCfg, bin);
}

export function pickBestPieceForSheet(
  remaining: CutPiece[],
  sheet: SheetDefinition,
  strategy: PlacementStrategy,
  state: StrategyState,
  placedRects: PlacedRect[],
  kerf: number,
  searchWindow: number,
  rotationCfg: RotationScoringConfig,
  bin: BinHeuristic,
  deps: CutLayoutPlacementSelectorDeps
): { index: number; placement: PlacementCandidate } | null {
  if (remaining.length === 0) return null;
  const currentUtil = deps.calculateSheetUtilization(placedRects, sheet.largura_mm, sheet.altura_mm);
  const limit = Math.max(1, Math.min(searchWindow, remaining.length));
  const dynamicLimit =
    bin === "bestFit"
      ? Math.min(remaining.length, Math.max(limit, Math.floor(limit * 2.4)))
      : limit;

  if (bin === "firstFit") {
    for (let i = 0; i < limit; i++) {
      const placement = findPlacementForPiece(
        remaining[i],
        strategy,
        sheet,
        placedRects,
        state,
        kerf,
        rotationCfg,
        bin,
        deps
      );
      if (placement) return { index: i, placement };
    }
    return null;
  }

  let best: { index: number; placement: PlacementCandidate; score: number } | null = null;
  for (let i = 0; i < dynamicLimit; i++) {
    const placement = findPlacementForPiece(
      remaining[i],
      strategy,
      sheet,
      placedRects,
      state,
      kerf,
      rotationCfg,
      bin,
      deps
    );
    if (!placement) continue;
    const score = deps.scorePlacement(sheet, placement, currentUtil, rotationCfg);
    if (!best || score > best.score) best = { index: i, placement, score };
  }
  return best ? { index: best.index, placement: best.placement } : null;
}
