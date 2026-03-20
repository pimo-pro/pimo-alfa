/**
 * Nesting Engine v2:
 * - Multi-heurística: skyline, shelf, guillotine.
 * - Bin-packing: first-fit e best-fit.
 * - Seleção automática da melhor tentativa por score global.
 * - Mantém rotação 0/90, kerf e compatibilidade de saída para CNC.
 */

import type {
  CutPiece,
  CutPlacement,
  SheetDefinition,
  SheetResult,
  CutLayoutResult,
} from "./cutLayoutTypes";
import type { LayoutVisualMaterial, OperationResult } from "../types";
import { getMaterialByIdOrLabel } from "../materials/service";
import { CUT_LAYOUT_SAFETY_MARGIN_MM } from "./layoutCoordinateSystem";
import { SYSTEM_BACK_MM } from "../baseCabinets";
import {
  applyFixedMarginOffset as applyFixedMarginOffsetUtil,
  cloneSheets as cloneSheetsUtil,
  createUsableSheetArea as createUsableSheetAreaUtil,
  estimateUsefulLeftover as estimateUsefulLeftoverUtil,
  expandPieces as expandPiecesUtil,
  flattenPlacements as flattenPlacementsUtil,
  getPieceArea as getPieceAreaUtil,
  getPieceAspectRatio as getPieceAspectRatioUtil,
  groupByMaterialAndThickness as groupByMaterialAndThicknessUtil,
  groupByThicknessOnly as groupByThicknessOnlyUtil,
  isInsideSheet as isInsideSheetUtil,
  isRotatablePiece as isRotatablePieceUtil,
  layoutFromPlacements as layoutFromPlacementsUtil,
  overlaps as overlapsUtil,
  partitionPlacementsIntoSheets as partitionPlacementsIntoSheetsUtil,
  reorderPieces as reorderPiecesUtil,
} from "./utils/cutLayoutUtils";
import {
  createSeededRng as createSeededRngUtil,
  randomInt as randomIntUtil,
  shuffleArray as shuffleArrayUtil,
  type SeededRng,
} from "./utils/cutLayoutRng";
import {
  monotonicHull as monotonicHullUtil,
  polygonArea as polygonAreaUtil,
  rectArea as rectAreaUtil,
  rectIntersectArea as rectIntersectAreaUtil,
} from "./utils/cutLayoutGeometry";
import {
  findPlacementSkyline as findPlacementSkylineSolver,
  getCandidateX as getCandidateXSolver,
  getSkylineHeight as getSkylineHeightSolver,
  getSkylineYAt as getSkylineYAtSolver,
  mergeSkylineSegments as mergeSkylineSegmentsSolver,
  updateSkyline as updateSkylineSolver,
} from "./solver/strategySkyline";
import { findPlacementShelf as findPlacementShelfSolver } from "./solver/strategyShelf";
import {
  findPlacementGuillotine as findPlacementGuillotineSolver,
  pruneContainedFreeRects as pruneContainedFreeRectsSolver,
  splitGuillotineRect as splitGuillotineRectSolver,
} from "./solver/strategyGuillotine";
import {
  initStrategyState as initStrategyStateSolver,
  updateStrategyState as updateStrategyStateSolver,
} from "./solver/strategyState";
import {
  findPlacementForPiece as findPlacementForPieceSelector,
  pickBestPieceForSheet as pickBestPieceForSheetSelector,
} from "./solver/placementSelector";
import {
  buildCandidateCoordinates as buildCandidateCoordinatesScoring,
  computePlacementCompactnessScore as computePlacementCompactnessScoreScoring,
  findBestResidualPlacement as findBestResidualPlacementScoring,
  getSheetBoundingBox as getSheetBoundingBoxScoring,
  scorePlacement as scorePlacementScoring,
} from "./scoring/placementScoring";
import {
  chooseOrientationWithRotationBias as chooseOrientationWithRotationBiasScoring,
  getOrientations as getOrientationsScoring,
  pickBestCandidateByRotation as pickBestCandidateByRotationScoring,
  scoreOrientationFit as scoreOrientationFitScoring,
  type PlacementCandidate,
  type RotationScoringConfig,
} from "./scoring/rotationScoring";
import {
  computeSheetAdvancedMetrics as computeSheetAdvancedMetricsScoring,
  type SheetAdvancedMetrics,
} from "./scoring/advancedMetrics";
import {
  computeSolutionMetrics as computeSolutionMetricsScoring,
  type GlobalScoreMetrics,
} from "./scoring/solutionMetrics";
import { optimizeLastSheetLocally as optimizeLastSheetLocallyOpt } from "./optimization/lastSheetRefine";
import {
  applyLnsRepack as applyLnsRepackOpt,
  mutatePlacements as mutatePlacementsOpt,
  optimizeWithMetaHeuristics as optimizeWithMetaHeuristicsOpt,
} from "./optimization/metaheuristics";

const DEFAULT_KERF_MM = 3;
const MIN_UTILIZATION_PERCENT = 0.8;
const MAIN_SEARCH_WINDOW = 32;
const DEFAULT_ROTATION_WEIGHT = 0.35;
const DEFAULT_ROTATION_PENALTY = 0.25;
const DEFAULT_ROTATION_MODE: RotationPreferenceMode = "auto";
type RotationPreferenceMode = "auto" | "aggressive" | "disabled";
type PlacementStrategy = "skyline" | "shelf" | "guillotine";
type BinHeuristic = "firstFit" | "bestFit";
type ReorderMode = "production" | "gapFill";

type PlacedRect = { x: number; y: number; w: number; h: number };
type SkylineSegment = { x: number; y: number };
type Shelf = { y: number; height: number; nextX: number };
type FreeRect = { x: number; y: number; w: number; h: number };

type TrialConfig = {
  strategy: PlacementStrategy;
  binHeuristic: BinHeuristic;
};

type MetaMove = "swapBetweenSheets" | "movePieceAcrossSheets" | "reorderSheet" | "flipRotation";

type MetaHeuristicsOptions = {
  enabled?: boolean;
  iterations?: number;
  initialTemperature?: number;
  coolingRate?: number;
  lnsDestroyRatio?: number;
  multiStartCount?: number;
  seedBase?: number;
};
type ScoreModel = "legacy" | "v32";

export type CutLayoutEngineOptions = {
  sheetLargura_mm?: number;
  sheetAltura_mm?: number;
  kerf_mm?: number;
  minUtilizationPercent?: number;
  rotationWeight?: number;
  rotationPenalty?: number;
  rotationPreferenceMode?: RotationPreferenceMode;
  collectDiagnostics?: boolean;
  groupByThicknessOnly?: boolean;
  strategyTrials?: TrialConfig[];
  useMetaHeuristics?: boolean;
  metaHeuristics?: MetaHeuristicsOptions;
  scoreModel?: ScoreModel;
};

/** Formato de furo para layout/TCN (normalizado a partir de drillHoles ou legado). */
export type NormalizedHoleForPiece = {
  x: number;
  y: number;
  diameter: number;
  depth: number;
  holeType?: string;
  topDrillable?: boolean;
};

export type CutlistItemForPieces = {
  dimensoes: { largura: number; altura: number; profundidade: number };
  espessura: number;
  quantidade: number;
  boxId?: string;
  nome: string;
  material?: string;
  materialId?: string;
  /** Furos reais do painel (fonte única para Layout PRO e TCN). */
  drillHoles?: Array<{ x: number; y: number; diameter: number; depth: number; holeType?: string; face?: string; topDrillable?: boolean }>;
  sheetWidthMm?: number;
  sheetHeightMm?: number;
  sheetThicknessMm?: number;
  grainDirection?: "length" | "width" | "horizontal" | "vertical" | "none";
  visualMaterial?: LayoutVisualMaterial;
  uvScaleOverride?: { x: number; y: number };
  uvRotationOverride?: number;
};

type StateSkyline = { skyline: SkylineSegment[] };
type StateShelf = { shelves: Shelf[] };
type StateGuillotine = { freeRects: FreeRect[] };
type StrategyState = StateSkyline | StateShelf | StateGuillotine;

function getDefaultTrials(): TrialConfig[] {
  return [
    { strategy: "skyline", binHeuristic: "bestFit" },
    { strategy: "skyline", binHeuristic: "firstFit" },
    { strategy: "shelf", binHeuristic: "bestFit" },
    { strategy: "shelf", binHeuristic: "firstFit" },
    { strategy: "guillotine", binHeuristic: "bestFit" },
    { strategy: "guillotine", binHeuristic: "firstFit" },
  ];
}

function getDefaultMetaOptions(
  enabledFromFlag: boolean | undefined,
  raw?: MetaHeuristicsOptions
): Required<MetaHeuristicsOptions> {
  return {
    enabled: raw?.enabled ?? Boolean(enabledFromFlag),
    iterations: Math.max(10, raw?.iterations ?? 180),
    initialTemperature: Math.max(0.001, raw?.initialTemperature ?? 1.0),
    coolingRate: Math.min(0.999, Math.max(0.8, raw?.coolingRate ?? 0.97)),
    lnsDestroyRatio: Math.min(0.6, Math.max(0.05, raw?.lnsDestroyRatio ?? 0.2)),
    multiStartCount: Math.min(50, Math.max(1, raw?.multiStartCount ?? 1)),
    seedBase: Math.max(1, Math.floor(raw?.seedBase ?? 1337)),
  };
}

function isDevRuntime(): boolean {
  if (typeof process !== "undefined" && process?.env) {
    return process.env.NODE_ENV !== "production";
  }
  return true;
}

function getPieceArea(piece: CutPiece): number {
  return getPieceAreaUtil(piece);
}

function getPieceAspectRatio(piece: CutPiece): number {
  return getPieceAspectRatioUtil(piece);
}

function calculateSheetUtilization(placedRects: PlacedRect[], sheetW: number, sheetH: number): number {
  const sheetArea = Math.max(1, sheetW * sheetH);
  const usedArea = placedRects.reduce((acc, r) => acc + r.w * r.h, 0);
  return usedArea / sheetArea;
}

function isInsideSheet(x: number, y: number, w: number, h: number, sheet: SheetDefinition): boolean {
  return isInsideSheetUtil(x, y, w, h, sheet);
}

function createUsableSheetArea(sheet: SheetDefinition, marginMm: number): SheetDefinition {
  return createUsableSheetAreaUtil(sheet, marginMm);
}

function applyFixedMarginOffset(
  sheets: SheetResult[],
  physicalSheet: SheetDefinition,
  marginMm: number
): SheetResult[] {
  return applyFixedMarginOffsetUtil(sheets, physicalSheet, marginMm);
}

function overlaps(x: number, y: number, w: number, h: number, placed: PlacedRect[], kerf: number): boolean {
  return overlapsUtil(x, y, w, h, placed, kerf);
}

function expandPieces(pieces: CutPiece[]): CutPiece[] {
  return expandPiecesUtil(pieces);
}

function groupByMaterialAndThickness(pieces: CutPiece[]): Map<string, CutPiece[]> {
  return groupByMaterialAndThicknessUtil(pieces);
}

function groupByThicknessOnly(pieces: CutPiece[]): Map<string, CutPiece[]> {
  return groupByThicknessOnlyUtil(pieces);
}

const isRotatablePiece = (piece: CutPiece): boolean => isRotatablePieceUtil(piece);

function reorderPieces(pieces: CutPiece[], mode: ReorderMode = "production"): CutPiece[] {
  return reorderPiecesUtil(pieces, mode);
}

function buildCandidateCoordinates(
  placed: CutPlacement[],
  pieceW: number,
  pieceH: number,
  sheet: SheetDefinition,
  kerf: number
): Array<{ x: number; y: number }> {
  return buildCandidateCoordinatesScoring(placed, pieceW, pieceH, sheet, kerf);
}

function computePlacementCompactnessScore(
  x: number,
  y: number,
  w: number,
  h: number,
  sheet: SheetDefinition
): number {
  return computePlacementCompactnessScoreScoring(x, y, w, h, sheet);
}

function findBestResidualPlacement(
  target: CutPlacement,
  existing: CutPlacement[],
  sheet: SheetDefinition,
  kerf: number
): CutPlacement | null {
  return findBestResidualPlacementScoring(target, existing, sheet, kerf, {
    isInsideSheet,
    overlaps,
  });
}

function getSheetBoundingBox(placements: CutPlacement[]) {
  return getSheetBoundingBoxScoring(placements);
}

function optimizeLastSheetLocally(
  sheets: SheetResult[],
  sheet: SheetDefinition,
  kerf: number,
  scoreModel: ScoreModel
): SheetResult[] {
  return optimizeLastSheetLocallyOpt(sheets, sheet, kerf, scoreModel, {
    getSheetBoundingBox,
    isInsideSheet,
    overlaps,
    findBestResidualPlacement,
    computePlacementCompactnessScore,
    cloneSheets,
    computeSolutionMetrics,
  });
}

function scoreOrientationFit(
  candidate: { x: number; y: number; w: number; h: number },
  sheet: SheetDefinition
): number {
  return scoreOrientationFitScoring(candidate, sheet);
}

function getOrientations(piece: CutPiece, cfg: RotationScoringConfig): Array<{ w: number; h: number; rotation: number }> {
  return getOrientationsScoring(piece, cfg, isRotatablePiece);
}

function chooseOrientationWithRotationBias(
  normal: PlacementCandidate | null,
  rotated: PlacementCandidate | null,
  cfg: RotationScoringConfig
): PlacementCandidate | null {
  return chooseOrientationWithRotationBiasScoring(normal, rotated, cfg);
}

function pickBestCandidateByRotation(candidates: PlacementCandidate[], rotation: 0 | 90): PlacementCandidate | null {
  return pickBestCandidateByRotationScoring(candidates, rotation);
}

function getSkylineHeight(skyline: SkylineSegment[], xStart: number, width: number): number {
  return getSkylineHeightSolver(skyline, xStart, width);
}

function getSkylineYAt(skyline: SkylineSegment[], x: number): number {
  return getSkylineYAtSolver(skyline, x);
}

function mergeSkylineSegments(segments: SkylineSegment[]): SkylineSegment[] {
  return mergeSkylineSegmentsSolver(segments);
}

function updateSkyline(
  skyline: SkylineSegment[],
  x: number,
  y: number,
  w: number,
  h: number,
  kerf: number
): SkylineSegment[] {
  return updateSkylineSolver(skyline, x, y, w, h, kerf);
}

function getCandidateX(skyline: SkylineSegment[], sheetW: number, pieceW: number): number[] {
  return getCandidateXSolver(skyline, sheetW, pieceW);
}

function findPlacementSkyline(
  piece: CutPiece,
  sheet: SheetDefinition,
  placed: PlacedRect[],
  state: StateSkyline,
  kerf: number,
  cfg: RotationScoringConfig,
  bin: BinHeuristic
): PlacementCandidate | null {
  return findPlacementSkylineSolver(piece, sheet, placed, state, kerf, cfg, bin, {
    getOrientations,
    overlaps,
    scoreOrientationFit,
    pickBestCandidateByRotation,
    chooseOrientationWithRotationBias,
  }) as PlacementCandidate | null;
}

function findPlacementShelf(
  piece: CutPiece,
  sheet: SheetDefinition,
  placed: PlacedRect[],
  state: StateShelf,
  kerf: number,
  cfg: RotationScoringConfig,
  bin: BinHeuristic
): PlacementCandidate | null {
  return findPlacementShelfSolver(piece, sheet, placed, state, kerf, cfg, bin, {
    getOrientations,
    overlaps,
    scoreOrientationFit,
    pickBestCandidateByRotation,
    chooseOrientationWithRotationBias,
  }) as PlacementCandidate | null;
}

function splitGuillotineRect(rect: FreeRect, w: number, h: number, kerf: number): FreeRect[] {
  return splitGuillotineRectSolver(rect, w, h, kerf);
}

function pruneContainedFreeRects(rects: FreeRect[]): FreeRect[] {
  return pruneContainedFreeRectsSolver(rects);
}

function findPlacementGuillotine(
  piece: CutPiece,
  sheet: SheetDefinition,
  _placed: PlacedRect[],
  state: StateGuillotine,
  _kerf: number,
  cfg: RotationScoringConfig,
  bin: BinHeuristic
): PlacementCandidate | null {
  return findPlacementGuillotineSolver(piece, sheet, _placed, state, _kerf, cfg, bin, {
    getOrientations,
    scoreOrientationFit,
    pickBestCandidateByRotation,
    chooseOrientationWithRotationBias,
  }) as PlacementCandidate | null;
}

function updateStrategyState(
  strategy: PlacementStrategy,
  state: StrategyState,
  placement: PlacementCandidate,
  kerf: number
): StrategyState {
  return updateStrategyStateSolver(strategy, state as any, placement as any, kerf) as StrategyState;
}

function findPlacementForPiece(
  piece: CutPiece,
  strategy: PlacementStrategy,
  sheet: SheetDefinition,
  placedRects: PlacedRect[],
  state: StrategyState,
  kerf: number,
  rotationCfg: RotationScoringConfig,
  bin: BinHeuristic
): PlacementCandidate | null {
  return findPlacementForPieceSelector(piece, strategy, sheet, placedRects, state, kerf, rotationCfg, bin, {
    findPlacementSkyline,
    findPlacementShelf,
    findPlacementGuillotine,
  });
}

function initStrategyState(strategy: PlacementStrategy, sheet: SheetDefinition): StrategyState {
  return initStrategyStateSolver(strategy, sheet) as StrategyState;
}

function scorePlacement(
  sheet: SheetDefinition,
  placement: PlacementCandidate,
  currentUtilization: number,
  rotationCfg: RotationScoringConfig
): number {
  return scorePlacementScoring(sheet, placement, currentUtilization, rotationCfg);
}

function pickBestPieceForSheet(
  remaining: CutPiece[],
  sheet: SheetDefinition,
  strategy: PlacementStrategy,
  state: StrategyState,
  placedRects: PlacedRect[],
  kerf: number,
  searchWindow: number,
  rotationCfg: RotationScoringConfig,
  bin: BinHeuristic
): { index: number; placement: PlacementCandidate } | null {
  return pickBestPieceForSheetSelector(
    remaining,
    sheet,
    strategy,
    state,
    placedRects,
    kerf,
    searchWindow,
    rotationCfg,
    bin,
    {
      findPlacementSkyline,
      findPlacementShelf,
      findPlacementGuillotine,
      calculateSheetUtilization,
      scorePlacement,
    }
  );
}

function estimateUsefulLeftover(sheet: SheetDefinition, placed: PlacedRect[]): number {
  return estimateUsefulLeftoverUtil(sheet, placed);
}

function cloneSheets(sheets: SheetResult[]): SheetResult[] {
  return cloneSheetsUtil(sheets);
}

function flattenPlacements(sheets: SheetResult[]): CutPlacement[] {
  return flattenPlacementsUtil(sheets);
}

function partitionPlacementsIntoSheets(
  placements: CutPlacement[],
  sheet: SheetDefinition
): SheetResult[] {
  return partitionPlacementsIntoSheetsUtil(placements, sheet);
}

function layoutFromPlacements(
  placements: CutPlacement[],
  sheet: SheetDefinition
): { sheets: SheetResult[]; rejectedByLimit: Array<{ partName: string; boxId: string; largura_mm: number; altura_mm: number; reason: string }> } {
  return layoutFromPlacementsUtil(placements, sheet);
}

function computeSolutionMetrics(sheets: SheetResult[], sheet: SheetDefinition, scoreModel: ScoreModel = "legacy"): GlobalScoreMetrics {
  return computeSolutionMetricsScoring(sheets, sheet, scoreModel, {
    estimateUsefulLeftover,
    computeSheetAdvancedMetrics,
  });
}

function randomInt(maxExclusive: number): number {
  return randomIntUtil(maxExclusive);
}

function createSeededRng(seed: number): SeededRng {
  return createSeededRngUtil(seed);
}

function shuffleArray<T>(arr: T[], rng: SeededRng): T[] {
  return shuffleArrayUtil(arr, rng);
}

function rectArea(r: PlacedRect): number {
  return rectAreaUtil(r);
}

function rectIntersectArea(a: PlacedRect, b: PlacedRect): number {
  return rectIntersectAreaUtil(a, b);
}

function monotonicHull(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  return monotonicHullUtil(points);
}

function polygonArea(poly: Array<{ x: number; y: number }>): number {
  return polygonAreaUtil(poly);
}

function computeSheetAdvancedMetrics(sheet: SheetDefinition, placements: CutPlacement[]): SheetAdvancedMetrics {
  return computeSheetAdvancedMetricsScoring(sheet, placements, {
    rectArea,
    rectIntersectArea,
    monotonicHull,
    polygonArea,
  });
}

function mutatePlacements(
  placements: CutPlacement[],
  move: MetaMove,
  _sheet: SheetDefinition,
  rng?: SeededRng
): CutPlacement[] {
  return mutatePlacementsOpt(placements, move, _sheet, rng, { randomInt });
}

function applyLnsRepack(
  placements: CutPlacement[],
  sheet: SheetDefinition,
  kerf: number,
  minUtilizationPercent: number,
  rotationCfg: RotationScoringConfig,
  destroyRatio: number,
  rng?: SeededRng,
  trialPool?: TrialConfig[],
  scoreModel: ScoreModel = "legacy"
): SheetResult[] {
  return applyLnsRepackOpt(
    placements,
    sheet,
    kerf,
    minUtilizationPercent,
    rotationCfg,
    destroyRatio,
    rng,
    trialPool,
    scoreModel,
    {
      randomInt,
      simulateTrialForGroup,
      computeSolutionMetrics,
    }
  );
}

function optimizeWithMetaHeuristics(
  initialSheets: SheetResult[],
  sheet: SheetDefinition,
  kerf: number,
  minUtilizationPercent: number,
  rotationCfg: RotationScoringConfig,
  meta: Required<MetaHeuristicsOptions>,
  seed: number = 1,
  trialPool?: TrialConfig[],
  scoreModel: ScoreModel = "legacy"
): {
  sheets: SheetResult[];
  diagnostics: {
    iterations: number;
    bestScore: number;
    initialScore: number;
    improvementPercent: number;
    acceptedMoves: number;
    totalMoves: number;
  };
} {
  return optimizeWithMetaHeuristicsOpt(
    initialSheets,
    sheet,
    kerf,
    minUtilizationPercent,
    rotationCfg,
    meta,
    seed,
    trialPool,
    scoreModel,
    {
      randomInt,
      createSeededRng,
      cloneSheets,
      flattenPlacements,
      layoutFromPlacements,
      computeSolutionMetrics,
      simulateTrialForGroup,
    }
  );
}

function simulateTrialForGroup(
  pieces: CutPiece[],
  sheet: SheetDefinition,
  kerf: number,
  minUtilizationPercent: number,
  rotationCfg: RotationScoringConfig,
  trial: TrialConfig,
  collectDiagnostics: boolean,
  forceInputOrder: boolean = false,
  scoreModel: ScoreModel = "legacy"
): {
  sheets: SheetResult[];
  rejectedByLimit: Array<{ partName: string; boxId: string; largura_mm: number; altura_mm: number; reason: string }>;
  gapFillPlacements: Array<{
    partName: string;
    boxId: string;
    sheetIndex: number;
    rotacao: number;
    x_mm: number;
    y_mm: number;
    largura_mm: number;
    altura_mm: number;
  }>;
  gapFillAttempts: number;
  rescueAttempts: number;
  usedArea: number;
  usefulLeftoverArea: number;
  score: number;
  advanced: GlobalScoreMetrics["advanced"];
} {
  const remaining = forceInputOrder ? pieces.map((p) => ({ ...p })) : reorderPieces(pieces, "production");
  const sheets: SheetResult[] = [];
  const rejectedByLimit: Array<{ partName: string; boxId: string; largura_mm: number; altura_mm: number; reason: string }> = [];
  const gapFillPlacements: Array<{
    partName: string;
    boxId: string;
    sheetIndex: number;
    rotacao: number;
    x_mm: number;
    y_mm: number;
    largura_mm: number;
    altura_mm: number;
  }> = [];
  let gapFillAttempts = 0;
  let rescueAttempts = 0;

  while (remaining.length > 0) {
    const placements: CutPlacement[] = [];
    const placedRects: PlacedRect[] = [];
    let state = initStrategyState(trial.strategy, sheet);
    const sheetIndex = sheets.length;

    while (remaining.length > 0) {
      const best = pickBestPieceForSheet(
        remaining,
        sheet,
        trial.strategy,
        state,
        placedRects,
        kerf,
        MAIN_SEARCH_WINDOW,
        rotationCfg,
        trial.binHeuristic
      );
      if (!best) break;

      const piece = remaining[best.index];
      if (!isInsideSheet(best.placement.x, best.placement.y, best.placement.w, best.placement.h, sheet)) {
        rejectedByLimit.push({
          partName: piece.partName,
          boxId: piece.boxId,
          largura_mm: piece.largura_mm,
          altura_mm: piece.altura_mm,
          reason: "invalid-placement-outside-sheet",
        });
        remaining.splice(best.index, 1);
        continue;
      }

      placements.push({
        x_mm: best.placement.x,
        y_mm: best.placement.y,
        largura_mm: best.placement.w,
        altura_mm: best.placement.h,
        rotacao: best.placement.rotation,
        sheetIndex,
        boxId: piece.boxId,
        partName: piece.partName,
        materialId: piece.materialId,
        materialName: piece.materialName,
        holes: piece.holes,
        pieceNumber: piece.pieceNumber,
        shortCode: piece.shortCode,
      });
      placedRects.push({ x: best.placement.x, y: best.placement.y, w: best.placement.w, h: best.placement.h });
      state = updateStrategyState(trial.strategy, state, best.placement, kerf);
      remaining.splice(best.index, 1);
    }

    if (remaining.length > 0 && placements.length === 0) {
      rejectedByLimit.push({
        partName: remaining[0].partName,
        boxId: remaining[0].boxId,
        largura_mm: remaining[0].largura_mm,
        altura_mm: remaining[0].altura_mm,
        reason: "piece-does-not-fit-empty-sheet",
      });
      remaining.shift();
      continue;
    }

    if (remaining.length > 0) {
      gapFillAttempts += 1;
      const gapOrdered = reorderPieces(remaining, "gapFill");
      for (let i = 0; i < gapOrdered.length; i++) {
        const target = gapOrdered[i];
        const originalIndex = remaining.findIndex((r) => r === target);
        if (originalIndex < 0) continue;
        const fit = findPlacementForPiece(
          target,
          trial.strategy,
          sheet,
          placedRects,
          state,
          kerf,
          rotationCfg,
          "bestFit"
        );
        if (!fit) continue;
        placements.push({
          x_mm: fit.x,
          y_mm: fit.y,
          largura_mm: fit.w,
          altura_mm: fit.h,
          rotacao: fit.rotation,
          sheetIndex,
          boxId: target.boxId,
          partName: target.partName,
          materialId: target.materialId,
          materialName: target.materialName,
          holes: target.holes,
        });
        placedRects.push({ x: fit.x, y: fit.y, w: fit.w, h: fit.h });
        state = updateStrategyState(trial.strategy, state, fit, kerf);
        gapFillPlacements.push({
          partName: target.partName,
          boxId: target.boxId,
          sheetIndex,
          rotacao: fit.rotation,
          x_mm: fit.x,
          y_mm: fit.y,
          largura_mm: fit.w,
          altura_mm: fit.h,
        });
        remaining.splice(originalIndex, 1);
      }
    }

    if (remaining.length > 0) {
      const util = calculateSheetUtilization(placedRects, sheet.largura_mm, sheet.altura_mm);
      if (util < minUtilizationPercent) {
        rescueAttempts += 1;
        const rescue = pickBestPieceForSheet(
          remaining,
          sheet,
          trial.strategy,
          state,
          placedRects,
          kerf,
          remaining.length,
          rotationCfg,
          "bestFit"
        );
        if (rescue) {
          const piece = remaining[rescue.index];
          placements.push({
            x_mm: rescue.placement.x,
            y_mm: rescue.placement.y,
            largura_mm: rescue.placement.w,
            altura_mm: rescue.placement.h,
            rotacao: rescue.placement.rotation,
            sheetIndex,
            boxId: piece.boxId,
            partName: piece.partName,
            materialId: piece.materialId,
            materialName: piece.materialName,
            holes: piece.holes,
            pieceNumber: piece.pieceNumber,
            shortCode: piece.shortCode,
          });
          placedRects.push({
            x: rescue.placement.x,
            y: rescue.placement.y,
            w: rescue.placement.w,
            h: rescue.placement.h,
          });
          state = updateStrategyState(trial.strategy, state, rescue.placement, kerf);
          remaining.splice(rescue.index, 1);
        }
      }
    }

    sheets.push({
      sheet: { ...sheet },
      placements,
    });
  }

  const optimizedSheets = optimizeLastSheetLocally(sheets, sheet, kerf, scoreModel);
  const metrics = computeSolutionMetrics(optimizedSheets, sheet, scoreModel);

  return {
    sheets: optimizedSheets,
    rejectedByLimit: collectDiagnostics ? rejectedByLimit : [],
    gapFillPlacements: collectDiagnostics ? gapFillPlacements : [],
    gapFillAttempts,
    rescueAttempts,
    usedArea: metrics.usedArea,
    usefulLeftoverArea: metrics.usefulLeftoverArea,
    score: metrics.score,
    advanced: metrics.advanced,
  };
}

export function cutlistToPieces(items: CutlistItemForPieces[]): CutPiece[] {
  return items.flatMap((item) => {
    const raw = [
      Number(item.dimensoes?.largura) || 0,
      Number(item.dimensoes?.altura) || 0,
      Number(item.dimensoes?.profundidade) || 0,
    ].filter((n) => Number.isFinite(n) && n > 0);
    const dims = raw.length >= 2 ? [...raw].sort((a, b) => b - a) : [Math.max(raw[0] ?? 1, 1), 1];
    const largura = Math.round(Math.max(dims[0] ?? 1, 1));
    const altura = Math.round(Math.max(dims[1] ?? 1, 1));
    const tipoToken = String((item as { tipo?: unknown }).tipo ?? "").trim().toLowerCase();
    const nomeToken = String(item.nome ?? "").trim().toLowerCase();
    const isCosta = tipoToken === "costa" || nomeToken === "costa";
    const rawEsp = Number(item.espessura ?? item.dimensoes?.profundidade);
    // Regra industrial fixa: COSTA sempre 10mm (SYSTEM_BACK_MM).
    const esp = isCosta
      ? SYSTEM_BACK_MM
      : (Number.isFinite(rawEsp) && rawEsp > 0 ? rawEsp : 19);
    const materialRef = item.materialId ?? item.material;
    const materialRecord = materialRef ? getMaterialByIdOrLabel(String(materialRef)) : null;
    const sheetWidthMm = Number(item.sheetWidthMm ?? materialRecord?.sheetWidthMm);
    const sheetHeightMm = Number(item.sheetHeightMm ?? materialRecord?.sheetHeightMm);
    // A espessura da peça deve ser a fonte principal para o pipeline CNC.
    // Só respeitar sheetThicknessMm quando vier explicitamente no item.
    const explicitSheetThickness = Number(item.sheetThicknessMm);
    const sheetThicknessMm = Number.isFinite(explicitSheetThickness) && explicitSheetThickness > 0
      ? explicitSheetThickness
      : esp;
    const seen = new Set<string>();
    const normalizedHoles: NormalizedHoleForPiece[] = [];
    const add = (x: number, y: number, d: number, dep: number, ht?: string, td?: boolean) => {
      const k = `${x.toFixed(1)}_${y.toFixed(1)}`;
      if (seen.has(k)) return;
      seen.add(k);
      normalizedHoles.push({ x, y, diameter: d, depth: dep, holeType: ht, topDrillable: td });
    };
    // Quando as dimensões são reordenadas (largura < altura → peça fica altura×largura no layout),
    // as coordenadas dos furos (x,y) estão no espaço (largura, altura) do painel; no layout o eixo X
    // corresponde à altura e o Y à largura → trocar (x,y) para (y,x) para alinhar ao Layout de Corte PRO.
    const origL = Number(item.dimensoes?.largura) || 0;
    const origA = Number(item.dimensoes?.altura) || 0;
    const dimensionsSwapped = origL > 0 && origA > 0 && origL < origA;
    for (const h of item.drillHoles ?? []) {
      let x = Number(h?.x);
      let y = Number(h?.y);
      if (dimensionsSwapped) {
        [x, y] = [y, x];
      }
      const diameter = Number(h?.diameter);
      const depth = Number(h?.depth);
      if (Number.isFinite(x) && Number.isFinite(y) && diameter > 0 && depth > 0) {
        add(x, y, diameter, depth, (h as { holeType?: string })?.holeType, (h as { topDrillable?: boolean })?.topDrillable);
      }
    }
    const g = item.grainDirection;
    const grainDirection: "length" | "width" | undefined =
      g === "length" || g === "width" ? g : g === "horizontal" ? "length" : g === "vertical" ? "width" : undefined;
    const pieces: CutPiece[] = [];
    const itemWithMeta = item as typeof item & { pieceNumber?: number; shortCode?: string };
    const qty = Math.max(1, Number(item.quantidade) || 1);
    for (let i = 0; i < qty; i++) {
      pieces.push({
        largura_mm: largura,
        altura_mm: altura,
        espessura_mm: esp,
        sheetWidthMm: Number.isFinite(sheetWidthMm) && sheetWidthMm > 0 ? sheetWidthMm : undefined,
        sheetHeightMm: Number.isFinite(sheetHeightMm) && sheetHeightMm > 0 ? sheetHeightMm : undefined,
        sheetThicknessMm: Number.isFinite(sheetThicknessMm) && sheetThicknessMm > 0 ? sheetThicknessMm : undefined,
        quantidade: 1,
        boxId: item.boxId ?? "",
        partName: item.nome,
        materialId: item.materialId ?? item.material,
        materialName: item.material,
        holes: normalizedHoles.length > 0 ? normalizedHoles : undefined,
        grainDirection,
        visualMaterial: item.visualMaterial,
        uvScaleOverride: item.uvScaleOverride,
        uvRotationOverride: item.uvRotationOverride,
        pieceNumber: itemWithMeta.pieceNumber,
        shortCode: itemWithMeta.shortCode,
      });
    }
    return pieces;
  });
}

export function runCutLayout(
  pieces: CutPiece[],
  sheetDef: SheetDefinition,
  options?: CutLayoutEngineOptions
): CutLayoutResult {
  const kerf = options?.kerf_mm ?? DEFAULT_KERF_MM;
  const minUtilizationPercent = options?.minUtilizationPercent ?? MIN_UTILIZATION_PERCENT;
  const rotationCfg: RotationScoringConfig = {
    rotationWeight: options?.rotationWeight ?? DEFAULT_ROTATION_WEIGHT,
    rotationPenalty: options?.rotationPenalty ?? DEFAULT_ROTATION_PENALTY,
    rotationPreferenceMode: options?.rotationPreferenceMode ?? DEFAULT_ROTATION_MODE,
  };

  const grouped = (options?.groupByThicknessOnly ? groupByThicknessOnly : groupByMaterialAndThickness)(
    expandPieces(pieces)
  );
  const trials = options?.strategyTrials && options.strategyTrials.length > 0 ? options.strategyTrials : getDefaultTrials();
  const metaCfg = getDefaultMetaOptions(options?.useMetaHeuristics, options?.metaHeuristics);
  const scoreModel: ScoreModel = options?.scoreModel ?? "legacy";

  const finalSheets: SheetResult[] = [];
  const diagnostics: CutLayoutResult["diagnostics"] | undefined = options?.collectDiagnostics
    ? {
      flow: {
        skylineEnabled: true,
        shelfEnabled: true,
        guillotineEnabled: true,
        reorderEnabled: true,
        gapFillEnabled: true,
        gapFillAttempts: 0,
        rescueAttempts: 0,
        rotationPreferenceMode: rotationCfg.rotationPreferenceMode,
        selectedStrategy: "skyline" as PlacementStrategy,
        selectedBinHeuristic: "bestFit" as BinHeuristic,
      },
      trialRuns: [] as Array<{
        strategy: PlacementStrategy;
        binHeuristic: BinHeuristic;
        sheetCount: number;
        usedArea: number;
        wasteArea: number;
        usefulLeftoverArea: number;
        score: number;
      }>,
      metaHeuristics: isDevRuntime()
        ? {
          iterations: 0,
          bestScore: 0,
          initialScore: 0,
          improvementPercent: 0,
          acceptedMoves: 0,
          totalMoves: 0,
          initialSolutions: 0,
          winningSeed: 0,
          winningStrategy: "skyline",
          winningBinHeuristic: "bestFit",
          convexHullWasteBySheet: [] as number[],
          fragmentationScore: 0,
          pocketsCount: 0,
          linearGapScore: 0,
          compactnessScore: 0,
        }
        : undefined,
      rejectedByLimit: [] as Array<{
        partName: string;
        boxId: string;
        largura_mm: number;
        altura_mm: number;
        reason: string;
      }>,
      gapFillPlacements: [] as Array<{
        partName: string;
        boxId: string;
        sheetIndex: number;
        rotacao: number;
        x_mm: number;
        y_mm: number;
        largura_mm: number;
        altura_mm: number;
      }>,
    }
    : undefined;

  for (const [key, groupPieces] of grouped) {
    const espStr = options?.groupByThicknessOnly ? key : key.split("|")[1];
    const materialId = options?.groupByThicknessOnly
      ? (sheetDef.materialId ?? groupPieces[0]?.materialId ?? "material")
      : key.split("|")[0];
    const perMaterialWidth = Number(groupPieces[0]?.sheetWidthMm);
    const perMaterialHeight = Number(groupPieces[0]?.sheetHeightMm);
    const perMaterialSheetThickness = Number(groupPieces[0]?.sheetThicknessMm);
    const sheet: SheetDefinition = {
      largura_mm: options?.sheetLargura_mm ?? (perMaterialWidth > 0 ? perMaterialWidth : sheetDef.largura_mm),
      altura_mm: options?.sheetAltura_mm ?? (perMaterialHeight > 0 ? perMaterialHeight : sheetDef.altura_mm),
      espessura_mm: perMaterialSheetThickness > 0 ? perMaterialSheetThickness : (Number(espStr) || sheetDef.espessura_mm),
      materialId: materialId !== "material" ? materialId : sheetDef.materialId,
      materialName: groupPieces[0]?.materialName ?? sheetDef.materialName,
    };
    const marginMm = CUT_LAYOUT_SAFETY_MARGIN_MM;
    const placementSheet = createUsableSheetArea(sheet, marginMm);
    const sheetArea = Math.max(1, sheet.largura_mm * sheet.altura_mm);

    let bestRun:
      | (ReturnType<typeof simulateTrialForGroup> & {
        strategy: PlacementStrategy;
        binHeuristic: BinHeuristic;
      })
      | null = null;

    for (const trial of trials) {
      const run = simulateTrialForGroup(
        groupPieces,
        placementSheet,
        kerf,
        minUtilizationPercent,
        rotationCfg,
        trial,
        Boolean(options?.collectDiagnostics),
        false,
        scoreModel
      );
      const wasteArea = run.sheets.length * sheetArea - run.usedArea;
      diagnostics?.trialRuns?.push({
        strategy: trial.strategy,
        binHeuristic: trial.binHeuristic,
        sheetCount: run.sheets.length,
        usedArea: run.usedArea,
        wasteArea,
        usefulLeftoverArea: run.usefulLeftoverArea,
        score: run.score,
      });
      if (!bestRun || run.score < bestRun.score) {
        bestRun = { ...run, strategy: trial.strategy, binHeuristic: trial.binHeuristic };
      }
    }

    if (!bestRun) continue;

    if (metaCfg.enabled && bestRun.sheets.length > 0) {
      const baselineRefScore = bestRun.score;
      const startCount = metaCfg.multiStartCount;
      let globalBestSheets = cloneSheets(bestRun.sheets);
      let globalBestScore = bestRun.score;
      let globalAcceptedMoves = 0;
      let winningSeed = metaCfg.seedBase;
      let winningStrategy: PlacementStrategy = bestRun.strategy;
      let winningBin: BinHeuristic = bestRun.binHeuristic;

      const strategyPool: TrialConfig[] = [
        { strategy: "skyline", binHeuristic: "firstFit" },
        { strategy: "skyline", binHeuristic: "bestFit" },
        { strategy: "shelf", binHeuristic: "firstFit" },
        { strategy: "shelf", binHeuristic: "bestFit" },
        { strategy: "guillotine", binHeuristic: "firstFit" },
        { strategy: "guillotine", binHeuristic: "bestFit" },
      ];

      for (let si = 0; si < startCount; si++) {
        const seed = metaCfg.seedBase + si;
        const rng = createSeededRng(seed);
        const initialTrial = strategyPool[rng.int(strategyPool.length)];
        const shuffledPieces = shuffleArray(groupPieces, rng);
        const rotationModes: RotationPreferenceMode[] = ["aggressive", "auto", "disabled"];
        const seededRotationCfg: RotationScoringConfig = {
          ...rotationCfg,
          rotationPreferenceMode: rotationModes[rng.int(rotationModes.length)],
        };

        const seededRun = simulateTrialForGroup(
          shuffledPieces,
          placementSheet,
          kerf,
          minUtilizationPercent,
          seededRotationCfg,
          initialTrial,
          false,
          true,
          scoreModel
        );
        const startSheets = seededRun.sheets.length > 0 ? seededRun.sheets : bestRun.sheets;
        const local = optimizeWithMetaHeuristics(
          startSheets,
          placementSheet,
          kerf,
          minUtilizationPercent,
          seededRotationCfg,
          metaCfg,
          seed,
          strategyPool,
          scoreModel
        );
        const localScore = computeSolutionMetrics(local.sheets, placementSheet, scoreModel).score;
        globalAcceptedMoves += local.diagnostics.acceptedMoves;
        if (localScore < globalBestScore) {
          globalBestScore = localScore;
          globalBestSheets = cloneSheets(local.sheets);
          winningSeed = seed;
          winningStrategy = initialTrial.strategy;
          winningBin = initialTrial.binHeuristic;
        }
      }

      if (globalBestScore <= baselineRefScore) {
        bestRun.sheets = globalBestSheets;
        bestRun.score = globalBestScore;
        bestRun.strategy = winningStrategy;
        bestRun.binHeuristic = winningBin;
      }
      if (diagnostics && isDevRuntime()) {
        const advanced = computeSolutionMetrics(globalBestSheets, placementSheet, scoreModel).advanced;
        diagnostics.metaHeuristics = {
          iterations: metaCfg.iterations * startCount,
          bestScore: Math.min(baselineRefScore, globalBestScore),
          initialScore: baselineRefScore,
          improvementPercent: baselineRefScore > 0
            ? Number((((baselineRefScore - Math.min(baselineRefScore, globalBestScore)) / baselineRefScore) * 100).toFixed(3))
            : 0,
          acceptedMoves: globalAcceptedMoves,
          totalMoves: metaCfg.iterations * startCount,
          initialSolutions: startCount,
          winningSeed,
          winningStrategy,
          winningBinHeuristic: winningBin,
          convexHullWasteBySheet: advanced.perSheet.map((p) => p.convexHullWaste),
          fragmentationScore: advanced.fragmentationScoreTotal,
          pocketsCount: advanced.pocketsCountTotal,
          linearGapScore: advanced.linearGapScoreTotal,
          compactnessScore: advanced.compactnessScoreTotal,
        };
      }
    }

    if (diagnostics) {
      diagnostics.flow.selectedStrategy = bestRun.strategy;
      diagnostics.flow.selectedBinHeuristic = bestRun.binHeuristic;
      diagnostics.flow.gapFillAttempts += bestRun.gapFillAttempts;
      diagnostics.flow.rescueAttempts += bestRun.rescueAttempts;
    }
    diagnostics?.rejectedByLimit.push(...bestRun.rejectedByLimit);
    diagnostics?.gapFillPlacements.push(...bestRun.gapFillPlacements);
    finalSheets.push(...applyFixedMarginOffset(bestRun.sheets, sheet, marginMm));
  }

  return diagnostics ? { sheets: finalSheets, diagnostics } : { sheets: finalSheets };
}

export function runCutLayoutResult(
  pieces: CutPiece[],
  sheetDef: SheetDefinition,
  options?: CutLayoutEngineOptions
): OperationResult<CutLayoutResult> {
  try {
    const data = runCutLayout(pieces, sheetDef, options);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao executar cut layout.";
    return { success: false, error: message };
  }
}
