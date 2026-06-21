import type { CutPiece, SheetDefinition } from "../cutLayoutTypes";
import type { PlacementCandidate, RotationScoringConfig } from "../scoring/rotationScoring";
import type { ContextoChapa } from "../scoring/placementScoring";

// Área máxima para considerar uma peça "pequena" no gap-fill scan (~141×141 mm²)
const GAP_FILL_SMALL_PIECE_AREA_MM2 = 20_000;

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
    _piece: CutPiece,
    _sheet: SheetDefinition,
    _placed: PlacedRect[],
    _state: StateSkyline,
    _kerf: number,
    _cfg: RotationScoringConfig,
    _bin: BinHeuristic
  ) => PlacementCandidate | null;
  findPlacementShelf: (
    _piece: CutPiece,
    _sheet: SheetDefinition,
    _placed: PlacedRect[],
    _state: StateShelf,
    _kerf: number,
    _cfg: RotationScoringConfig,
    _bin: BinHeuristic
  ) => PlacementCandidate | null;
  findPlacementGuillotine: (
    _piece: CutPiece,
    _sheet: SheetDefinition,
    _placed: PlacedRect[],
    _state: StateGuillotine,
    _kerf: number,
    _cfg: RotationScoringConfig,
    _bin: BinHeuristic
  ) => PlacementCandidate | null;
};

export type CutLayoutPlacementSelectorDeps = CutLayoutStrategyPlacementDeps & {
  calculateSheetUtilization: (_placedRects: PlacedRect[], _sheetW: number, _sheetH: number) => number;
  scorePlacement: (
    _sheet: SheetDefinition,
    _placement: PlacementCandidate,
    _currentUtilization: number,
    _rotationCfg: RotationScoringConfig,
    _ctx?: ContextoChapa
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
  deps: CutLayoutPlacementSelectorDeps,
  ctx?: ContextoChapa
): { index: number; placement: PlacementCandidate } | null {
  if (remaining.length === 0) return null;
  const currentUtil = deps.calculateSheetUtilization(placedRects, sheet.largura_mm, sheet.altura_mm);
  const limit = Math.max(1, Math.min(searchWindow, remaining.length));
  const dynamicLimit =
    bin === "bestFit"
      ? Math.min(remaining.length, Math.max(limit, Math.floor(limit * 3.0)))
      : limit;

  if (bin === "firstFit") {
    const scanFirstFit = (from: number, to: number) => {
      const end = Math.min(to, remaining.length);
      for (let i = from; i < end; i++) {
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
    };
    const head = scanFirstFit(0, limit);
    if (head) return head;
    if (remaining.length > limit) {
      return scanFirstFit(limit, remaining.length);
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
    const score = deps.scorePlacement(sheet, placement, currentUtil, rotationCfg, ctx);
    if (!best || score > best.score) best = { index: i, placement, score };
  }
  if (!best && remaining.length > dynamicLimit) {
    for (let i = dynamicLimit; i < remaining.length; i++) {
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
      const score = deps.scorePlacement(sheet, placement, currentUtil, rotationCfg, ctx);
      if (!best || score > best.score) best = { index: i, placement, score };
    }
  }

  // Gap-fill scan: procura SEMPRE peças pequenas no resto da lista,
  // independentemente de já ter encontrado um best — uma peça pequena pode
  // encaixar num gap melhor do que a peça já selecionada.
  if (bin === "bestFit" && remaining.length > dynamicLimit) {
    for (let i = dynamicLimit; i < remaining.length; i++) {
      const piece = remaining[i];
      if (piece.largura_mm * piece.altura_mm > GAP_FILL_SMALL_PIECE_AREA_MM2) continue;
      const placement = findPlacementForPiece(
        piece,
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
      const score = deps.scorePlacement(sheet, placement, currentUtil, rotationCfg, ctx);
      if (!best || score > best.score) best = { index: i, placement, score };
    }
  }

  return best ? { index: best.index, placement: best.placement } : null;
}
