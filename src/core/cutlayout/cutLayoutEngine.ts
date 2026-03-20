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

const DEFAULT_KERF_MM = 3;
const MIN_UTILIZATION_PERCENT = 0.8;
const MAIN_SEARCH_WINDOW = 32;
const DEFAULT_ROTATION_WEIGHT = 0.35;
const DEFAULT_ROTATION_PENALTY = 0.25;
const DEFAULT_ROTATION_MODE: RotationPreferenceMode = "auto";
const EPS = 0.001;
const LAST_SHEET_SMALL_PART_THRESHOLD_MM2 = 120000; // ~350x350
const LAST_SHEET_MICRO_ADJUST_MM = 3;

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

function tryMicroAdjustLastSheet(placements: CutPlacement[], sheet: SheetDefinition): CutPlacement[] {
  if (placements.length <= 1) return placements;
  const adjusted = placements.map((p) => ({ ...p }));
  const offsets = [-LAST_SHEET_MICRO_ADJUST_MM, -2, -1, 1, 2, LAST_SHEET_MICRO_ADJUST_MM];
  const startBox = getSheetBoundingBox(adjusted);
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
        if (!isInsideSheet(nx, ny, p.largura_mm, p.altura_mm, sheet)) continue;
        const others: PlacedRect[] = adjusted
          .filter((_, idx) => idx !== i)
          .map((o) => ({ x: o.x_mm, y: o.y_mm, w: o.largura_mm, h: o.altura_mm }));
        if (overlaps(nx, ny, p.largura_mm, p.altura_mm, others, 0)) continue;
        const trial = adjusted.map((o, idx) => (idx === i ? { ...o, x_mm: nx, y_mm: ny } : o));
        const box = getSheetBoundingBox(trial);
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

function tryLocalRotationRefine(placements: CutPlacement[], sheet: SheetDefinition, kerf: number): CutPlacement[] {
  if (placements.length <= 1) return placements;
  const refined = placements.map((p) => ({ ...p }));
  for (let i = 0; i < refined.length; i++) {
    const p = refined[i];
    if (Math.abs(p.largura_mm - p.altura_mm) < EPS) continue;
    const others = refined.filter((_, idx) => idx !== i).map((o) => ({ ...o }));
    const rotatedCandidate = findBestResidualPlacement(
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
    const oldScore = computePlacementCompactnessScore(p.x_mm, p.y_mm, p.largura_mm, p.altura_mm, sheet);
    const newScore = computePlacementCompactnessScore(
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

function trySwapSmallPieceToPrevious(
  previous: SheetResult[],
  lastPlacements: CutPlacement[],
  sheet: SheetDefinition,
  kerf: number
): { moved: boolean; lastPlacements: CutPlacement[] } {
  const smallLast = [...lastPlacements]
    .filter((p) => p.largura_mm * p.altura_mm <= LAST_SHEET_SMALL_PART_THRESHOLD_MM2)
    .sort((a, b) => a.largura_mm * a.altura_mm - b.largura_mm * b.altura_mm);

  for (const target of smallLast) {
    for (let sIdx = 0; sIdx < previous.length; sIdx++) {
      const sheetRes = previous[sIdx];
      const candidates = [...sheetRes.placements]
        .sort((a, b) => a.largura_mm * a.altura_mm - b.largura_mm * b.altura_mm)
        .slice(0, 6);
      for (const victim of candidates) {
        const kept = sheetRes.placements.filter((p) => p !== victim);
        const fitTarget = findBestResidualPlacement(target, kept, sheet, kerf);
        if (!fitTarget) continue;
        const nextLastBase = lastPlacements.filter((p) => p !== target);
        const fitVictimInLast = findBestResidualPlacement(victim, nextLastBase, sheet, kerf);
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

function optimizeLastSheetLocally(
  sheets: SheetResult[],
  sheet: SheetDefinition,
  kerf: number,
  scoreModel: ScoreModel
): SheetResult[] {
  if (sheets.length <= 1) return sheets;
  const cloned = cloneSheets(sheets);
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
      const fit = findBestResidualPlacement(piece, targetSheet.placements, sheet, kerf);
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
  const swapAttempt = trySwapSmallPieceToPrevious(previous, nextLastPlacements, sheet, kerf);
  if (swapAttempt.moved) nextLastPlacements = swapAttempt.lastPlacements;
  nextLastPlacements = tryLocalRotationRefine(nextLastPlacements, sheet, kerf);
  nextLastPlacements = tryMicroAdjustLastSheet(nextLastPlacements, sheet);
  if (nextLastPlacements.length === 0) {
    const compact = previous.map((s, idx) => ({
      sheet: { ...s.sheet },
      placements: s.placements.map((p) => ({ ...p, sheetIndex: idx })),
    }));
    return compact;
  }

  const baseMetrics = computeSolutionMetrics(cloned, sheet, scoreModel);
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
  const candidateMetrics = computeSolutionMetrics(candidateSheets, sheet, scoreModel);
  return candidateMetrics.score <= baseMetrics.score ? candidateSheets : cloned;
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
  const rnd = rng ?? { int: randomInt };
  if (placements.length === 0) return placements.map((p) => ({ ...p }));
  const out = placements.map((p) => ({ ...p }));
  const bySheet = new Map<number, number[]>();
  out.forEach((p, idx) => {
    if (!bySheet.has(p.sheetIndex)) bySheet.set(p.sheetIndex, []);
    bySheet.get(p.sheetIndex)!.push(idx);
  });
  const sheetKeys = Array.from(bySheet.keys());
  if (sheetKeys.length === 0) return out;

  if (move === "swapBetweenSheets" && sheetKeys.length >= 2) {
    const sA = sheetKeys[rnd.int(sheetKeys.length)];
    let sB = sheetKeys[rnd.int(sheetKeys.length)];
    if (sA === sB && sheetKeys.length > 1) sB = sheetKeys[(sheetKeys.indexOf(sA) + 1) % sheetKeys.length];
    const idxA = bySheet.get(sA)?.[rnd.int(bySheet.get(sA)!.length)];
    const idxB = bySheet.get(sB)?.[rnd.int(bySheet.get(sB)!.length)];
    if (idxA !== undefined && idxB !== undefined) {
      const tmp = out[idxA];
      out[idxA] = out[idxB];
      out[idxB] = tmp;
    }
    return out;
  }

  if (move === "movePieceAcrossSheets" && sheetKeys.length >= 2) {
    const from = sheetKeys[rnd.int(sheetKeys.length)];
    let to = sheetKeys[rnd.int(sheetKeys.length)];
    if (from === to && sheetKeys.length > 1) to = sheetKeys[(sheetKeys.indexOf(from) + 1) % sheetKeys.length];
    const src = bySheet.get(from) ?? [];
    if (src.length > 0) {
      const idx = src[rnd.int(src.length)];
      const [item] = out.splice(idx, 1);
      const insertionBase = bySheet.get(to) ?? [];
      const insertPos = insertionBase.length > 0 ? insertionBase[rnd.int(insertionBase.length)] : out.length;
      out.splice(Math.min(insertPos, out.length), 0, item);
    }
    return out;
  }

  if (move === "reorderSheet") {
    const targetSheet = sheetKeys[rnd.int(sheetKeys.length)];
    const indices = [...(bySheet.get(targetSheet) ?? [])];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = rnd.int(i + 1);
      const a = indices[i];
      const b = indices[j];
      const tmp = out[a];
      out[a] = out[b];
      out[b] = tmp;
    }
    return out;
  }

  // flipRotation: move piece close to front/back to alter insertion dynamics.
  const idx = rnd.int(out.length);
  const [picked] = out.splice(idx, 1);
  out.splice(rnd.int(2) === 0 ? 0 : out.length, 0, picked);
  return out;
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
  const rnd = rng ?? { int: randomInt };
  const all = placements.map((p) => ({ ...p }));
  if (all.length === 0) return [];

  // LNS destroy/repair guiado por hotspots de vazio:
  // prioriza remoção em chapas com maior desperdício local.
  const destroyCount = Math.max(1, Math.floor(all.length * destroyRatio));
  const removed: CutPlacement[] = [];
  const bySheet = new Map<number, CutPlacement[]>();
  for (const p of all) {
    if (!bySheet.has(p.sheetIndex)) bySheet.set(p.sheetIndex, []);
    bySheet.get(p.sheetIndex)!.push(p);
  }
  const sheetHotspots = Array.from(bySheet.entries())
    .map(([sheetIndex, list]) => {
      const used = list.reduce((acc, p) => acc + p.largura_mm * p.altura_mm, 0);
      const area = Math.max(1, sheet.largura_mm * sheet.altura_mm);
      const waste = area - used;
      return { sheetIndex, waste };
    })
    .sort((a, b) => b.waste - a.waste);
  const hotspotSet = new Set(sheetHotspots.slice(0, Math.max(1, Math.ceil(sheetHotspots.length / 2))).map((s) => s.sheetIndex));

  for (let i = 0; i < destroyCount && all.length > 0; i++) {
    const hotspotCandidates = all
      .map((p, idx) => ({ idx, p }))
      .filter((x) => hotspotSet.has(x.p.sheetIndex));
    const pool = hotspotCandidates.length > 0 ? hotspotCandidates : all.map((p, idx) => ({ idx, p }));
    const pick = pool[rnd.int(pool.length)];
    removed.push(all[pick.idx]);
    all.splice(pick.idx, 1);
  }
  for (const r of removed) {
    const pos = rnd.int(all.length + 1);
    all.splice(pos, 0, r);
  }

  const allPieces: CutPiece[] = all.map((p) => ({
    largura_mm: p.largura_mm,
    altura_mm: p.altura_mm,
    espessura_mm: sheet.espessura_mm,
    quantidade: 1,
    boxId: p.boxId,
    partName: p.partName,
    materialId: p.materialId,
    materialName: p.materialName,
  }));

  const candidateTrials: TrialConfig[] = trialPool && trialPool.length > 0 ? trialPool : [
    { strategy: "skyline", binHeuristic: "firstFit" },
    { strategy: "skyline", binHeuristic: "bestFit" },
    { strategy: "shelf", binHeuristic: "firstFit" },
    { strategy: "guillotine", binHeuristic: "firstFit" },
  ];
  let bestSheets: SheetResult[] = [];
  let bestScore = Number.POSITIVE_INFINITY;
  for (let i = 0; i < Math.min(4, candidateTrials.length); i++) {
    const trial = candidateTrials[(i + rnd.int(candidateTrials.length)) % candidateTrials.length];
    const packed = simulateTrialForGroup(
      allPieces,
      sheet,
      kerf,
      minUtilizationPercent,
      rotationCfg,
      trial,
      false,
      true,
      scoreModel
    );
    const score = computeSolutionMetrics(packed.sheets, sheet, scoreModel).score;
    if (score < bestScore) {
      bestScore = score;
      bestSheets = packed.sheets;
    }
  }
  bestSheets.forEach((s, idx) => s.placements.forEach((p) => (p.sheetIndex = idx)));
  return bestSheets;
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
  const rng = createSeededRng(seed);
  let current = cloneSheets(initialSheets);
  let currentMetrics = computeSolutionMetrics(current, sheet, scoreModel);
  let best = cloneSheets(current);
  let bestMetrics = { ...currentMetrics };
  const initialMetrics = { ...currentMetrics };
  let temp = meta.initialTemperature;
  let acceptedMoves = 0;

  const moves: MetaMove[] = ["swapBetweenSheets", "movePieceAcrossSheets", "reorderSheet", "flipRotation"];
  for (let iter = 0; iter < meta.iterations; iter++) {
    const move = moves[rng.int(moves.length)];
    const basePlacements = flattenPlacements(current);
    const mutated = mutatePlacements(basePlacements, move, sheet, rng);
    let candidateSheets: SheetResult[] = applyLnsRepack(
      mutated,
      sheet,
      kerf,
      minUtilizationPercent,
      rotationCfg,
      meta.lnsDestroyRatio,
      rng,
      trialPool,
      scoreModel
    );
    candidateSheets = layoutFromPlacements(flattenPlacements(candidateSheets), sheet).sheets;
    if (candidateSheets.length === 0) continue;
    const candidateMetrics = computeSolutionMetrics(candidateSheets, sheet, scoreModel);
    const delta = candidateMetrics.score - currentMetrics.score;
    const normalizedDelta = delta / 100000;
    const accept = normalizedDelta <= 0 || Math.exp(-normalizedDelta / Math.max(0.001, temp)) > rng.next();
    if (accept) {
      current = cloneSheets(candidateSheets);
      currentMetrics = candidateMetrics;
      acceptedMoves++;
      if (candidateMetrics.score < bestMetrics.score) {
        best = cloneSheets(candidateSheets);
        bestMetrics = { ...candidateMetrics };
      }
    }
    temp *= meta.coolingRate;
  }

  const improvementPercent =
    initialMetrics.score > 0
      ? Number((((initialMetrics.score - bestMetrics.score) / initialMetrics.score) * 100).toFixed(3))
      : 0;
  return {
    sheets: bestMetrics.score <= initialMetrics.score ? best : cloneSheets(initialSheets),
    diagnostics: {
      iterations: meta.iterations,
      bestScore: bestMetrics.score,
      initialScore: initialMetrics.score,
      improvementPercent,
      acceptedMoves,
      totalMoves: meta.iterations,
    },
  };
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
