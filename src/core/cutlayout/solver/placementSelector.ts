import type { CutPiece, SheetDefinition } from "../cutLayoutTypes";
import type { PlacementCandidate, RotationScoringConfig } from "../scoring/rotationScoring";
import type { ContextoChapa } from "../scoring/placementScoring";
import { simulatePlacementAndEstimateWaste } from "../scoring/lookaheadScoring";

/** Área máxima para considerar uma peça "pequena" no gap-fill scan (~283×283 mm²). Fase A (A5). */
const GAP_FILL_SMALL_PIECE_AREA_MM2 = 80_000;

/** Janela máxima de pesquisa por colocação. Fase A (A2). */
const MAIN_SEARCH_WINDOW_MAX = 128;

/** Acima deste limiar, usar amostragem estratificada. Fase A (A2). */
const STRATIFIED_SAMPLE_THRESHOLD = 80;

const STRATIFIED_SAMPLE_EACH = 20;

/** Fase B (B2): top-N candidatos para lookahead 1-passo. */
const LOOKAHEAD_TOP_N = 3;

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

function pieceArea(p: CutPiece): number {
  return p.largura_mm * p.altura_mm;
}

/**
 * Fase A (A2): índices a avaliar — janela adaptativa até 128 peças ou amostragem estratificada.
 */
export function buildSearchIndices(remaining: CutPiece[], searchWindowMax: number = MAIN_SEARCH_WINDOW_MAX): number[] {
  const n = remaining.length;
  const cap = Math.min(n, Math.max(1, searchWindowMax));
  if (n <= cap) {
    return Array.from({ length: n }, (_, i) => i);
  }
  if (n > STRATIFIED_SAMPLE_THRESHOLD) {
    const indexed = remaining.map((p, i) => ({ i, area: pieceArea(p) }));
    indexed.sort((a, b) => b.area - a.area);
    const picked = new Set<number>();
    for (let k = 0; k < STRATIFIED_SAMPLE_EACH && k < indexed.length; k++) {
      picked.add(indexed[k]!.i);
    }
    for (let k = 0; k < STRATIFIED_SAMPLE_EACH && k < indexed.length; k++) {
      picked.add(indexed[indexed.length - 1 - k]!.i);
    }
    const midStart = Math.max(0, Math.floor((indexed.length - STRATIFIED_SAMPLE_EACH) / 2));
    for (let k = 0; k < STRATIFIED_SAMPLE_EACH && midStart + k < indexed.length; k++) {
      picked.add(indexed[midStart + k]!.i);
    }
    return Array.from(picked).sort((a, b) => a - b);
  }
  return Array.from({ length: cap }, (_, i) => i);
}

/** B2: entre top-N por score, escolhe o que minimiza desperdício estimado. */
function applyLookaheadPick(
  scored: Array<{ index: number; placement: PlacementCandidate; score: number }>,
  placedRects: PlacedRect[],
  sheet: SheetDefinition,
  kerf: number
): { index: number; placement: PlacementCandidate } | null {
  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, LOOKAHEAD_TOP_N);
  if (top.length === 1) return { index: top[0]!.index, placement: top[0]!.placement };
  let best = top[0]!;
  let minWaste = simulatePlacementAndEstimateWaste(best.placement, placedRects, sheet, kerf);
  for (let k = 1; k < top.length; k++) {
    const c = top[k]!;
    const waste = simulatePlacementAndEstimateWaste(c.placement, placedRects, sheet, kerf);
    if (waste < minWaste || (waste === minWaste && c.score > best.score)) {
      minWaste = waste;
      best = c;
    }
  }
  return { index: best.index, placement: best.placement };
}

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
  const windowCap = Math.min(MAIN_SEARCH_WINDOW_MAX, Math.max(1, searchWindow));
  const searchIndices = buildSearchIndices(remaining, windowCap);

  if (bin === "firstFit") {
    for (const i of searchIndices) {
      const placement = findPlacementForPiece(
        remaining[i]!,
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
    for (let i = 0; i < remaining.length; i++) {
      if (searchIndices.includes(i)) continue;
      const placement = findPlacementForPiece(
        remaining[i]!,
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
  const scored: Array<{ index: number; placement: PlacementCandidate; score: number }> = [];
  const searchSet = new Set(searchIndices);

  for (const i of searchIndices) {
    const placement = findPlacementForPiece(
      remaining[i]!,
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
    scored.push({ index: i, placement, score });
    if (!best || score > best.score) best = { index: i, placement, score };
  }

  // Gap-fill scan: peças pequenas fora da janela principal.
  if (remaining.length > searchIndices.length) {
    for (let i = 0; i < remaining.length; i++) {
      if (searchSet.has(i)) continue;
      const piece = remaining[i]!;
      if (pieceArea(piece) > GAP_FILL_SMALL_PIECE_AREA_MM2) continue;
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
      scored.push({ index: i, placement, score });
      if (!best || score > best.score) best = { index: i, placement, score };
    }
  }

  if (scored.length === 0) return null;
  return applyLookaheadPick(scored, placedRects, sheet, kerf);
}
