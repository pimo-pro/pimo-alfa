import type {
  Nesting3HybridResult,
  Nesting3Options,
  Nesting3Piece,
  Nesting3ScoredResult,
  Nesting3Sheet,
  Nesting3StrategyResult,
} from "./nesting3Types";
import { preprocessPieces } from "./preprocessPieces";
import { scoreNestingResult } from "./scoring";
import { runStrategyBlockPacking } from "./strategyBlockPacking";
import { runStrategyFFD } from "./strategyFFD";
import { runStrategyShelf } from "./strategyShelf";
import { runStrategySkyline } from "./strategySkyline";

function scoreAll(results: Nesting3StrategyResult[], sheets: Nesting3Sheet[], options: Nesting3Options): Nesting3ScoredResult[] {
  return results.map((result) => ({
    ...result,
    scoring: scoreNestingResult(result, sheets, options.timeNormalizationMs),
  }));
}

function pickBest(results: Nesting3ScoredResult[]): Nesting3ScoredResult {
  return [...results].sort((a, b) => {
    if (a.unplacedPieceIds.length !== b.unplacedPieceIds.length) {
      return a.unplacedPieceIds.length - b.unplacedPieceIds.length;
    }
    if (a.sheetsUsed !== b.sheetsUsed) return a.sheetsUsed - b.sheetsUsed;
    return b.scoring.score - a.scoring.score;
  })[0]!;
}

function repackLastThree(
  best: Nesting3ScoredResult,
  pieces: Nesting3Piece[],
  sheets: Nesting3Sheet[],
  options: Nesting3Options
): Nesting3ScoredResult[] {
  const lastIds = best.placements.slice(-3).map((p) => p.pieceId);
  const priority = [
    ...pieces.filter((p) => lastIds.includes(p.id)),
    ...pieces.filter((p) => !lastIds.includes(p.id)),
  ];
  return scoreAll(
    [
      runStrategySkyline(priority, sheets, options),
      runStrategyBlockPacking(priority, sheets, options),
    ],
    sheets,
    options
  );
}

export function runHybridNesting(
  rawPieces: Nesting3Piece[],
  sheets: Nesting3Sheet[],
  options: Nesting3Options
): Nesting3HybridResult {
  const preprocessed = preprocessPieces(rawPieces);
  const pieces = preprocessed.pieces;
  const opts: Nesting3Options = {
    maxExtraSheets: 10,
    targetScore: 0.75,
    maxCandidateSteps: 5000,
    timeNormalizationMs: 250,
    ...options,
  };
  const initial = scoreAll(
    [
      runStrategyFFD(pieces, sheets, opts),
      runStrategySkyline(pieces, sheets, opts),
      runStrategyShelf(pieces, sheets, opts),
      runStrategyBlockPacking(pieces, sheets, opts),
    ],
    sheets,
    opts
  );
  let attempts = initial;
  let best = pickBest(attempts);
  if (best.scoring.score < (opts.targetScore ?? 0.75)) {
    attempts = [...attempts, ...repackLastThree(best, pieces, sheets, opts)];
    best = pickBest(attempts);
  }
  return { ...best, attempts };
}
