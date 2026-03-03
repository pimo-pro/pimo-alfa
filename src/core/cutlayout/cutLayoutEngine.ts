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

type RotationScoringConfig = {
  rotationWeight: number;
  rotationPenalty: number;
  rotationPreferenceMode: RotationPreferenceMode;
};

type PlacementCandidate = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  orientationScore: number;
  rotationDelta: number;
  alternativeRotationAvailable: boolean;
};

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
  return Math.max(1, piece.largura_mm * piece.altura_mm);
}

function getPieceAspectRatio(piece: CutPiece): number {
  const a = Math.max(piece.largura_mm, piece.altura_mm);
  const b = Math.max(1, Math.min(piece.largura_mm, piece.altura_mm));
  return a / b;
}

function calculateSheetUtilization(placedRects: PlacedRect[], sheetW: number, sheetH: number): number {
  const sheetArea = Math.max(1, sheetW * sheetH);
  const usedArea = placedRects.reduce((acc, r) => acc + r.w * r.h, 0);
  return usedArea / sheetArea;
}

function isInsideSheet(x: number, y: number, w: number, h: number, sheet: SheetDefinition): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) return false;
  if (w <= 0 || h <= 0) return false;
  if (x < -EPS || y < -EPS) return false;
  if (x + w > sheet.largura_mm + EPS) return false;
  if (y + h > sheet.altura_mm + EPS) return false;
  return true;
}

function createUsableSheetArea(sheet: SheetDefinition, marginMm: number): SheetDefinition {
  return {
    ...sheet,
    largura_mm: Math.max(1, sheet.largura_mm - marginMm * 2),
    altura_mm: Math.max(1, sheet.altura_mm - marginMm * 2),
  };
}

function applyFixedMarginOffset(
  sheets: SheetResult[],
  physicalSheet: SheetDefinition,
  marginMm: number
): SheetResult[] {
  return sheets.map((s, idx) => ({
    sheet: { ...physicalSheet },
    placements: s.placements.map((p) => ({
      ...p,
      x_mm: p.x_mm + marginMm,
      y_mm: p.y_mm + marginMm,
      sheetIndex: idx,
    })),
  }));
}

function overlaps(x: number, y: number, w: number, h: number, placed: PlacedRect[], kerf: number): boolean {
  const margin = kerf / 2;
  for (const r of placed) {
    if (
      x + w + margin > r.x - margin &&
      r.x + r.w + margin > x - margin &&
      y + h + margin > r.y - margin &&
      r.y + r.h + margin > y - margin
    ) {
      return true;
    }
  }
  return false;
}

function expandPieces(pieces: CutPiece[]): CutPiece[] {
  const out: CutPiece[] = [];
  for (const p of pieces) {
    for (let i = 0; i < (p.quantidade ?? 1); i++) {
      out.push({ ...p, quantidade: 1 });
    }
  }
  return out;
}

function groupByMaterialAndThickness(pieces: CutPiece[]): Map<string, CutPiece[]> {
  const map = new Map<string, CutPiece[]>();
  for (const p of pieces) {
    const key = `${p.materialId ?? "material"}|${p.espessura_mm}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return map;
}

function groupByThicknessOnly(pieces: CutPiece[]): Map<string, CutPiece[]> {
  const map = new Map<string, CutPiece[]>();
  for (const p of pieces) {
    const key = String(p.espessura_mm);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return map;
}

const isRotatablePiece = (piece: CutPiece): boolean => !piece.grainDirection && piece.largura_mm !== piece.altura_mm;

function reorderPieces(pieces: CutPiece[], mode: ReorderMode = "production"): CutPiece[] {
  return [...pieces].sort((a, b) => {
    if (mode === "production") {
      const matA = a.materialId ?? "";
      const matB = b.materialId ?? "";
      if (matA !== matB) return matA.localeCompare(matB);
      // Ordenação inteligente: área desc, depois maior lado, depois menor lado.
      const areaDiff = getPieceArea(b) - getPieceArea(a);
      if (areaDiff !== 0) return areaDiff;
      const bMax = Math.max(b.largura_mm, b.altura_mm);
      const aMax = Math.max(a.largura_mm, a.altura_mm);
      if (bMax !== aMax) return bMax - aMax;
      const bMin = Math.min(b.largura_mm, b.altura_mm);
      const aMin = Math.min(a.largura_mm, a.altura_mm);
      if (bMin !== aMin) return bMin - aMin;
      return getPieceAspectRatio(b) - getPieceAspectRatio(a);
    }

    const areaDiff = getPieceArea(a) - getPieceArea(b);
    if (areaDiff !== 0) return areaDiff;
    return getPieceAspectRatio(b) - getPieceAspectRatio(a);
  });
}

function buildCandidateCoordinates(
  placed: CutPlacement[],
  pieceW: number,
  pieceH: number,
  sheet: SheetDefinition,
  kerf: number
): Array<{ x: number; y: number }> {
  const xs = new Set<number>([0, Math.max(0, sheet.largura_mm - pieceW)]);
  const ys = new Set<number>([0, Math.max(0, sheet.altura_mm - pieceH)]);
  for (const p of placed) {
    xs.add(Math.max(0, p.x_mm + p.largura_mm + kerf));
    ys.add(Math.max(0, p.y_mm + p.altura_mm + kerf));
    xs.add(Math.max(0, p.x_mm - pieceW - kerf));
    ys.add(Math.max(0, p.y_mm - pieceH - kerf));
  }
  const out: Array<{ x: number; y: number }> = [];
  const xList = Array.from(xs).filter((x) => x + pieceW <= sheet.largura_mm + EPS);
  const yList = Array.from(ys).filter((y) => y + pieceH <= sheet.altura_mm + EPS);
  for (const x of xList) {
    for (const y of yList) out.push({ x, y });
  }
  return out;
}

function computePlacementCompactnessScore(
  x: number,
  y: number,
  w: number,
  h: number,
  sheet: SheetDefinition
): number {
  const rightSlack = Math.max(0, sheet.largura_mm - (x + w));
  const topSlack = Math.max(0, sheet.altura_mm - (y + h));
  const localWaste = rightSlack * h + topSlack * w;
  const compactBonus = 1 - (x / Math.max(1, sheet.largura_mm)) * 0.35 - (y / Math.max(1, sheet.altura_mm)) * 0.65;
  return compactBonus * 100000 - localWaste;
}

function findBestResidualPlacement(
  target: CutPlacement,
  existing: CutPlacement[],
  sheet: SheetDefinition,
  kerf: number
): CutPlacement | null {
  const variants = [
    { w: target.largura_mm, h: target.altura_mm, rotacao: target.rotacao },
    { w: target.altura_mm, h: target.largura_mm, rotacao: target.rotacao === 90 ? 0 : 90 },
  ].filter((v, i, arr) => i === 0 || v.w !== arr[0].w || v.h !== arr[0].h);

  const placedRects = existing.map((p) => ({ x: p.x_mm, y: p.y_mm, w: p.largura_mm, h: p.altura_mm }));
  let best: CutPlacement | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const v of variants) {
    const coords = buildCandidateCoordinates(existing, v.w, v.h, sheet, kerf);
    for (const c of coords) {
      if (!isInsideSheet(c.x, c.y, v.w, v.h, sheet)) continue;
      if (overlaps(c.x, c.y, v.w, v.h, placedRects, kerf)) continue;
      const score = computePlacementCompactnessScore(c.x, c.y, v.w, v.h, sheet);
      if (score > bestScore) {
        bestScore = score;
        best = {
          ...target,
          x_mm: c.x,
          y_mm: c.y,
          largura_mm: v.w,
          altura_mm: v.h,
          rotacao: v.rotacao,
        };
      }
    }
  }
  return best;
}

function getSheetBoundingBox(placements: CutPlacement[]) {
  if (placements.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, area: 0 };
  const minX = Math.min(...placements.map((p) => p.x_mm));
  const minY = Math.min(...placements.map((p) => p.y_mm));
  const maxX = Math.max(...placements.map((p) => p.x_mm + p.largura_mm));
  const maxY = Math.max(...placements.map((p) => p.y_mm + p.altura_mm));
  return { minX, minY, maxX, maxY, area: Math.max(1, (maxX - minX) * (maxY - minY)) };
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
  const sheetW = Math.max(1, sheet.largura_mm);
  const sheetH = Math.max(1, sheet.altura_mm);
  const sheetArea = Math.max(1, sheetW * sheetH);
  const rightSlack = Math.max(0, sheetW - (candidate.x + candidate.w));
  const topSlack = Math.max(0, sheetH - (candidate.y + candidate.h));
  const bottomLeft = 1 - (candidate.y / sheetH) * 0.7 - (candidate.x / sheetW) * 0.3;
  const stripWaste = (rightSlack * candidate.h + topSlack * candidate.w) / sheetArea;
  const fillQuality = 1 - stripWaste;
  return bottomLeft * 0.55 + fillQuality * 0.45;
}

function getOrientations(piece: CutPiece, cfg: RotationScoringConfig): Array<{ w: number; h: number; rotation: number }> {
  const list = [{ w: piece.largura_mm, h: piece.altura_mm, rotation: 0 }];
  const canRotate = cfg.rotationPreferenceMode !== "disabled" && isRotatablePiece(piece);
  if (canRotate) list.push({ w: piece.altura_mm, h: piece.largura_mm, rotation: 90 });
  return list;
}

function chooseOrientationWithRotationBias(
  normal: PlacementCandidate | null,
  rotated: PlacementCandidate | null,
  cfg: RotationScoringConfig
): PlacementCandidate | null {
  if (!normal && !rotated) return null;
  if (normal && !rotated) return normal;
  if (!normal && rotated) return rotated;

  const normalScore = normal!.orientationScore;
  const rotatedScore = rotated!.orientationScore;
  const rotationDelta = rotatedScore - normalScore;
  let adjustedNormal = normalScore;
  let adjustedRotated = rotatedScore;

  if (cfg.rotationPreferenceMode === "aggressive") {
    adjustedRotated += cfg.rotationWeight;
  } else if (cfg.rotationPreferenceMode === "auto") {
    adjustedRotated += Math.max(0, rotationDelta) * cfg.rotationWeight;
    if (rotationDelta > 0) adjustedNormal -= cfg.rotationPenalty * rotationDelta;
  }

  if (adjustedRotated > adjustedNormal) {
    return {
      ...rotated!,
      rotationDelta,
      alternativeRotationAvailable: true,
    };
  }
  return {
    ...normal!,
    rotationDelta,
    alternativeRotationAvailable: true,
  };
}

function pickBestCandidateByRotation(candidates: PlacementCandidate[], rotation: 0 | 90): PlacementCandidate | null {
  const pool = candidates.filter((c) => c.rotation === rotation);
  if (pool.length === 0) return null;
  return pool.sort((a, b) => b.orientationScore - a.orientationScore || a.y - b.y || a.x - b.x)[0];
}

function getSkylineHeight(skyline: SkylineSegment[], xStart: number, width: number): number {
  const xEnd = xStart + width;
  let maxY = 0;
  for (let i = 0; i < skyline.length - 1; i++) {
    const segStart = skyline[i].x;
    const segEnd = skyline[i + 1].x;
    if (segEnd <= xStart || segStart >= xEnd) continue;
    maxY = Math.max(maxY, skyline[i].y);
  }
  return maxY;
}

function getSkylineYAt(skyline: SkylineSegment[], x: number): number {
  for (let i = 0; i < skyline.length - 1; i++) {
    if (skyline[i].x <= x && x < skyline[i + 1].x) return skyline[i].y;
  }
  return skyline.length > 0 ? skyline[skyline.length - 1].y : 0;
}

function mergeSkylineSegments(segments: SkylineSegment[]): SkylineSegment[] {
  if (segments.length <= 1) return segments;
  const sorted = [...segments].sort((a, b) => a.x - b.x);
  const out: SkylineSegment[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y === out[out.length - 1].y) continue;
    out.push(sorted[i]);
  }
  return out;
}

function updateSkyline(
  skyline: SkylineSegment[],
  x: number,
  y: number,
  w: number,
  h: number,
  kerf: number
): SkylineSegment[] {
  const newH = y + h + kerf;
  const xEnd = x + w;
  const out: SkylineSegment[] = [];
  let i = 0;
  while (i < skyline.length && skyline[i].x < x) {
    out.push(skyline[i]);
    i++;
  }
  out.push({ x, y: newH });
  const heightAtEnd = getSkylineYAt(skyline, xEnd);
  while (i < skyline.length && skyline[i].x <= xEnd) i++;
  out.push({ x: xEnd, y: heightAtEnd });
  while (i < skyline.length) {
    out.push(skyline[i]);
    i++;
  }
  return mergeSkylineSegments(out);
}

function getCandidateX(skyline: SkylineSegment[], sheetW: number, pieceW: number): number[] {
  const xs = new Set<number>();
  xs.add(0);
  for (const seg of skyline) {
    if (seg.x >= 0 && seg.x <= sheetW - pieceW) xs.add(seg.x);
  }
  return Array.from(xs).sort((a, b) => a - b);
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
  const orientations = getOrientations(piece, cfg);
  const candidates: PlacementCandidate[] = [];

  for (const o of orientations) {
    if (o.w > sheet.largura_mm || o.h > sheet.altura_mm) continue;
    const xs = getCandidateX(state.skyline, sheet.largura_mm, o.w);
    for (const x of xs) {
      const y = getSkylineHeight(state.skyline, x, o.w);
      if (y + o.h > sheet.altura_mm) continue;
      if (overlaps(x, y, o.w, o.h, placed, kerf)) continue;
      candidates.push({
        x,
        y,
        w: o.w,
        h: o.h,
        rotation: o.rotation,
        orientationScore: scoreOrientationFit({ x, y, w: o.w, h: o.h }, sheet),
        rotationDelta: 0,
        alternativeRotationAvailable: false,
      });
      if (bin === "firstFit") break;
    }
  }

  if (candidates.length === 0) return null;
  const normal = pickBestCandidateByRotation(candidates, 0);
  const rotated = pickBestCandidateByRotation(candidates, 90);
  const picked = chooseOrientationWithRotationBias(normal, rotated, cfg);
  if (bin === "firstFit" && picked) return picked;

  return candidates.sort((a, b) => a.y - b.y || a.x - b.x || b.orientationScore - a.orientationScore)[0];
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
  const candidates: PlacementCandidate[] = [];
  const orientations = getOrientations(piece, cfg);
  const sortedShelves = [...state.shelves].sort((a, b) => a.y - b.y);

  for (const o of orientations) {
    for (const shelf of sortedShelves) {
      const x = shelf.nextX;
      const y = shelf.y;
      if (x + o.w > sheet.largura_mm + EPS) continue;
      if (o.h > shelf.height + EPS) continue;
      if (y + o.h > sheet.altura_mm + EPS) continue;
      if (overlaps(x, y, o.w, o.h, placed, kerf)) continue;
      candidates.push({
        x,
        y,
        w: o.w,
        h: o.h,
        rotation: o.rotation,
        orientationScore: scoreOrientationFit({ x, y, w: o.w, h: o.h }, sheet),
        rotationDelta: 0,
        alternativeRotationAvailable: false,
      });
      if (bin === "firstFit") break;
    }

    const maxY = state.shelves.length === 0
      ? 0
      : Math.max(...state.shelves.map((s) => s.y + s.height + kerf));
    if (maxY + o.h <= sheet.altura_mm + EPS && o.w <= sheet.largura_mm + EPS) {
      const x = 0;
      const y = maxY;
      if (!overlaps(x, y, o.w, o.h, placed, kerf)) {
        candidates.push({
          x,
          y,
          w: o.w,
          h: o.h,
          rotation: o.rotation,
          orientationScore: scoreOrientationFit({ x, y, w: o.w, h: o.h }, sheet),
          rotationDelta: 0,
          alternativeRotationAvailable: false,
        });
      }
    }
  }

  if (candidates.length === 0) return null;
  if (bin === "firstFit") {
    const normal = pickBestCandidateByRotation(candidates, 0);
    const rotated = pickBestCandidateByRotation(candidates, 90);
    return chooseOrientationWithRotationBias(normal, rotated, cfg);
  }

  return candidates.sort((a, b) => {
    const remainingA = sheet.largura_mm - (a.x + a.w);
    const remainingB = sheet.largura_mm - (b.x + b.w);
    return remainingA - remainingB || a.y - b.y || a.x - b.x;
  })[0];
}

function splitGuillotineRect(rect: FreeRect, w: number, h: number, kerf: number): FreeRect[] {
  const rightW = rect.w - w - kerf;
  const topH = rect.h - h - kerf;
  const result: FreeRect[] = [];
  if (rightW > EPS) result.push({ x: rect.x + w + kerf, y: rect.y, w: rightW, h });
  if (topH > EPS) result.push({ x: rect.x, y: rect.y + h + kerf, w: rect.w, h: topH });
  if (rightW > EPS && topH > EPS) {
    result.push({ x: rect.x + w + kerf, y: rect.y + h + kerf, w: rightW, h: topH });
  }
  return result;
}

function pruneContainedFreeRects(rects: FreeRect[]): FreeRect[] {
  return rects.filter((r, _i) => {
    for (let j = 0; j < rects.length; j++) {
      if (_i === j) continue;
      const o = rects[j];
      if (r.x >= o.x && r.y >= o.y && r.x + r.w <= o.x + o.w && r.y + r.h <= o.y + o.h) return false;
    }
    return true;
  });
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
  const candidates: PlacementCandidate[] = [];
  const orientations = getOrientations(piece, cfg);
  const orderedFreeRects = [...state.freeRects].sort((a, b) => a.y - b.y || a.x - b.x);

  for (const o of orientations) {
    for (const fr of orderedFreeRects) {
      if (o.w > fr.w + EPS || o.h > fr.h + EPS) continue;
      const x = fr.x;
      const y = fr.y;
      candidates.push({
        x,
        y,
        w: o.w,
        h: o.h,
        rotation: o.rotation,
        orientationScore: scoreOrientationFit({ x, y, w: o.w, h: o.h }, sheet),
        rotationDelta: 0,
        alternativeRotationAvailable: false,
      });
      if (bin === "firstFit") break;
    }
  }

  if (candidates.length === 0) return null;
  if (bin === "firstFit") {
    const normal = pickBestCandidateByRotation(candidates, 0);
    const rotated = pickBestCandidateByRotation(candidates, 90);
    return chooseOrientationWithRotationBias(normal, rotated, cfg);
  }

  return candidates.sort((a, b) => {
    const wasteA = (sheet.largura_mm - (a.x + a.w)) + (sheet.altura_mm - (a.y + a.h));
    const wasteB = (sheet.largura_mm - (b.x + b.w)) + (sheet.altura_mm - (b.y + b.h));
    return wasteA - wasteB || a.y - b.y || a.x - b.x;
  })[0];
}

function updateStrategyState(
  strategy: PlacementStrategy,
  state: StrategyState,
  placement: PlacementCandidate,
  kerf: number
): StrategyState {
  if (strategy === "skyline") {
    const sk = state as StateSkyline;
    return {
      skyline: updateSkyline(sk.skyline, placement.x, placement.y, placement.w, placement.h, kerf),
    };
  }
  if (strategy === "shelf") {
    const sh = state as StateShelf;
    const shelves = [...sh.shelves];
    const shelfIndex = shelves.findIndex((s) => Math.abs(s.y - placement.y) < EPS);
    if (shelfIndex >= 0) {
      shelves[shelfIndex] = {
        ...shelves[shelfIndex],
        height: Math.max(shelves[shelfIndex].height, placement.h),
        nextX: placement.x + placement.w + kerf,
      };
    } else {
      shelves.push({
        y: placement.y,
        height: placement.h,
        nextX: placement.x + placement.w + kerf,
      });
    }
    return { shelves };
  }

  const gu = state as StateGuillotine;
  const freeRects = [...gu.freeRects];
  const idx = freeRects.findIndex(
    (r) =>
      placement.x >= r.x - EPS &&
      placement.y >= r.y - EPS &&
      placement.x + placement.w <= r.x + r.w + EPS &&
      placement.y + placement.h <= r.y + r.h + EPS
  );
  if (idx >= 0) {
    const [used] = freeRects.splice(idx, 1);
    const split = splitGuillotineRect(used, placement.w, placement.h, kerf);
    freeRects.push(...split.filter((r) => r.w > EPS && r.h > EPS));
  }
  return { freeRects: pruneContainedFreeRects(freeRects) };
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
  if (strategy === "skyline") {
    return findPlacementSkyline(piece, sheet, placedRects, state as StateSkyline, kerf, rotationCfg, bin);
  }
  if (strategy === "shelf") {
    return findPlacementShelf(piece, sheet, placedRects, state as StateShelf, kerf, rotationCfg, bin);
  }
  return findPlacementGuillotine(piece, sheet, placedRects, state as StateGuillotine, kerf, rotationCfg, bin);
}

function initStrategyState(strategy: PlacementStrategy, sheet: SheetDefinition): StrategyState {
  if (strategy === "skyline") {
    return { skyline: [{ x: 0, y: 0 }, { x: sheet.largura_mm, y: 0 }] };
  }
  if (strategy === "shelf") {
    return { shelves: [] };
  }
  return { freeRects: [{ x: 0, y: 0, w: sheet.largura_mm, h: sheet.altura_mm }] };
}

function scorePlacement(
  sheet: SheetDefinition,
  placement: PlacementCandidate,
  currentUtilization: number,
  rotationCfg: RotationScoringConfig
): number {
  const sheetArea = Math.max(1, sheet.largura_mm * sheet.altura_mm);
  const areaGain = (placement.w * placement.h) / sheetArea;
  const bottomLeftBias =
    1 - (placement.y / Math.max(1, sheet.altura_mm)) - (placement.x / Math.max(1, sheet.largura_mm)) * 0.5;
  const expectedUtil = currentUtilization + areaGain;
  const utilizationReward = expectedUtil >= MIN_UTILIZATION_PERCENT ? 0.4 : expectedUtil * 0.2;
  let rotationScore = 0;
  if (rotationCfg.rotationPreferenceMode !== "disabled") {
    if (placement.rotation === 90) {
      rotationScore += rotationCfg.rotationWeight * (1 + Math.max(0, placement.rotationDelta));
    } else if (placement.alternativeRotationAvailable && placement.rotationDelta > 0) {
      rotationScore -= rotationCfg.rotationPenalty * placement.rotationDelta;
    }
  }
  return areaGain * 2.0 + bottomLeftBias * 0.3 + utilizationReward + placement.orientationScore * 0.25 + rotationScore;
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
  if (remaining.length === 0) return null;
  const currentUtil = calculateSheetUtilization(placedRects, sheet.largura_mm, sheet.altura_mm);
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
        bin
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
      bin
    );
    if (!placement) continue;
    const score = scorePlacement(sheet, placement, currentUtil, rotationCfg);
    if (!best || score > best.score) best = { index: i, placement, score };
  }
  return best ? { index: best.index, placement: best.placement } : null;
}

function estimateUsefulLeftover(sheet: SheetDefinition, placed: PlacedRect[]): number {
  if (placed.length === 0) return sheet.largura_mm * sheet.altura_mm;
  const maxX = Math.max(...placed.map((r) => r.x + r.w));
  const maxY = Math.max(...placed.map((r) => r.y + r.h));
  const rightStrip = Math.max(0, sheet.largura_mm - maxX) * sheet.altura_mm;
  const topStrip = Math.max(0, sheet.altura_mm - maxY) * sheet.largura_mm;
  return Math.max(rightStrip, topStrip);
}

function cloneSheets(sheets: SheetResult[]): SheetResult[] {
  return sheets.map((s) => ({
    sheet: { ...s.sheet },
    placements: s.placements.map((p) => ({ ...p })),
  }));
}

function flattenPlacements(sheets: SheetResult[]): CutPlacement[] {
  return sheets.flatMap((s, sheetIndex) => s.placements.map((p) => ({ ...p, sheetIndex })));
}

function partitionPlacementsIntoSheets(
  placements: CutPlacement[],
  sheet: SheetDefinition
): SheetResult[] {
  const groups = new Map<number, CutPlacement[]>();
  for (const p of placements) {
    if (!groups.has(p.sheetIndex)) groups.set(p.sheetIndex, []);
    groups.get(p.sheetIndex)!.push(p);
  }
  const sorted = Array.from(groups.keys()).sort((a, b) => a - b);
  return sorted.map((idx, normalizedIndex) => ({
    sheet: { ...sheet },
    placements: (groups.get(idx) ?? []).map((p) => ({ ...p, sheetIndex: normalizedIndex })),
  }));
}

function layoutFromPlacements(
  placements: CutPlacement[],
  sheet: SheetDefinition
): { sheets: SheetResult[]; rejectedByLimit: Array<{ partName: string; boxId: string; largura_mm: number; altura_mm: number; reason: string }> } {
  const rejectedByLimit: Array<{ partName: string; boxId: string; largura_mm: number; altura_mm: number; reason: string }> = [];
  const grouped = partitionPlacementsIntoSheets(placements, sheet);
  const validSheets: SheetResult[] = [];

  for (const s of grouped) {
    const withSafetyMargin = s.placements;
    const valid: CutPlacement[] = [];
    const rects: PlacedRect[] = [];
    for (const p of withSafetyMargin) {
      const inside = isInsideSheet(p.x_mm, p.y_mm, p.largura_mm, p.altura_mm, sheet);
      const collides = overlaps(p.x_mm, p.y_mm, p.largura_mm, p.altura_mm, rects, 0);
      if (!inside || collides) {
        rejectedByLimit.push({
          partName: p.partName,
          boxId: p.boxId,
          largura_mm: p.largura_mm,
          altura_mm: p.altura_mm,
          reason: !inside ? "meta-outside-sheet" : "meta-overlap",
        });
        continue;
      }
      valid.push(p);
      rects.push({ x: p.x_mm, y: p.y_mm, w: p.largura_mm, h: p.altura_mm });
    }
    if (valid.length > 0) {
      validSheets.push({
        sheet: { ...sheet },
        placements: valid.map((p) => ({ ...p, sheetIndex: validSheets.length })),
      });
    }
  }
  return { sheets: validSheets, rejectedByLimit };
}

function computeSolutionMetrics(
  sheets: SheetResult[],
  sheet: SheetDefinition,
  scoreModel: ScoreModel = "legacy"
): GlobalScoreMetrics {
  const sheetArea = Math.max(1, sheet.largura_mm * sheet.altura_mm);
  const usedArea = sheets.reduce((acc, s) => acc + s.placements.reduce((a, p) => a + p.largura_mm * p.altura_mm, 0), 0);
  const usefulLeftoverArea = sheets.reduce((acc, s) => {
    const rects = s.placements.map((p) => ({ x: p.x_mm, y: p.y_mm, w: p.largura_mm, h: p.altura_mm }));
    return acc + estimateUsefulLeftover(sheet, rects);
  }, 0);
  const wasteArea = sheets.length * sheetArea - usedArea;
  const perSheet = sheets.map((s) => computeSheetAdvancedMetrics(sheet, s.placements));
  const convexHullWasteTotal = perSheet.reduce((acc, p) => acc + p.convexHullWaste, 0);
  const fragmentationScoreTotal = perSheet.reduce((acc, p) => acc + p.fragmentationScore, 0);
  const pocketsCountTotal = perSheet.reduce((acc, p) => acc + p.pocketsCount, 0);
  const linearGapScoreTotal = perSheet.reduce((acc, p) => acc + p.linearGapScore, 0);
  const compactnessScoreTotal = perSheet.reduce((acc, p) => acc + p.compactnessScore, 0);
  const usefulRectangularScrapScoreTotal = perSheet.reduce((acc, p) => acc + p.usefulRectangularScrapScore, 0);

  let score = sheets.length * 1_000_000 + wasteArea - usefulLeftoverArea * 0.1;
  if (scoreModel === "v32") {
    // v3.2: aumenta sensibilidade intra-chapa.
    score += convexHullWasteTotal * 120_000;
    score += fragmentationScoreTotal * 65_000;
    score += pocketsCountTotal * 3_000;
    score += linearGapScoreTotal * 8_000;
    score -= compactnessScoreTotal * 22_000;
    score -= usefulRectangularScrapScoreTotal * 35_000;
  }

  return {
    usedArea,
    wasteArea,
    usefulLeftoverArea,
    score,
    advanced: {
      convexHullWasteTotal,
      fragmentationScoreTotal,
      pocketsCountTotal,
      linearGapScoreTotal,
      compactnessScoreTotal,
      usefulRectangularScrapScoreTotal,
      perSheet,
    },
  };
}

type SeededRng = {
  next: () => number;
  int: (_maxExclusive: number) => number;
};

function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * Math.max(1, maxExclusive));
}

type SheetAdvancedMetrics = {
  convexHullWaste: number;
  fragmentationScore: number;
  pocketsCount: number;
  linearGapScore: number;
  compactnessScore: number;
  usefulRectangularScrapScore: number;
};

type GlobalScoreMetrics = {
  usedArea: number;
  wasteArea: number;
  usefulLeftoverArea: number;
  score: number;
  advanced: {
    convexHullWasteTotal: number;
    fragmentationScoreTotal: number;
    pocketsCountTotal: number;
    linearGapScoreTotal: number;
    compactnessScoreTotal: number;
    usefulRectangularScrapScoreTotal: number;
    perSheet: SheetAdvancedMetrics[];
  };
};

function createSeededRng(seed: number): SeededRng {
  let state = (seed >>> 0) || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
  return {
    next,
    int: (maxExclusive: number) => Math.floor(next() * Math.max(1, maxExclusive)),
  };
}

function shuffleArray<T>(arr: T[], rng: SeededRng): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function rectArea(r: PlacedRect): number {
  return Math.max(0, r.w) * Math.max(0, r.h);
}

function rectIntersectArea(a: PlacedRect, b: PlacedRect): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
}

function monotonicHull(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (points.length <= 1) return points;
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Array<{ x: number; y: number }> = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Array<{ x: number; y: number }> = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function polygonArea(poly: Array<{ x: number; y: number }>): number {
  if (poly.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function computeSheetAdvancedMetrics(sheet: SheetDefinition, placements: CutPlacement[]): SheetAdvancedMetrics {
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
  const usedArea = rects.reduce((acc, r) => acc + rectArea(r), 0);
  const sheetArea = Math.max(1, sheet.largura_mm * sheet.altura_mm);

  // Convex hull waste.
  const pts: Array<{ x: number; y: number }> = [];
  for (const r of rects) {
    pts.push({ x: r.x, y: r.y });
    pts.push({ x: r.x + r.w, y: r.y });
    pts.push({ x: r.x + r.w, y: r.y + r.h });
    pts.push({ x: r.x, y: r.y + r.h });
  }
  const hull = monotonicHull(pts);
  const hullArea = Math.max(usedArea, polygonArea(hull));
  const convexHullWaste = Math.max(0, hullArea - usedArea);

  // Coarse occupancy grid for pockets/gaps/fragmentation.
  const grid = 48;
  const cellW = sheet.largura_mm / grid;
  const cellH = sheet.altura_mm / grid;
  const occ: boolean[][] = Array.from({ length: grid }, () => Array.from({ length: grid }, () => false));
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const cell: PlacedRect = { x: gx * cellW, y: gy * cellH, w: cellW, h: cellH };
      let covered = false;
      for (const r of rects) {
        if (rectIntersectArea(cell, r) > cellW * cellH * 0.35) {
          covered = true;
          break;
        }
      }
      occ[gy][gx] = covered;
    }
  }

  // fragmentation: transitions occupied<->empty.
  let transitions = 0;
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid - 1; gx++) transitions += occ[gy][gx] === occ[gy][gx + 1] ? 0 : 1;
  }
  for (let gx = 0; gx < grid; gx++) {
    for (let gy = 0; gy < grid - 1; gy++) transitions += occ[gy][gx] === occ[gy + 1][gx] ? 0 : 1;
  }
  const fragmentationScore = transitions / (grid * grid);

  // pockets: empty components fully internal (not touching border).
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

  // linear gaps: long empty runs in rows/cols.
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

  // compactness bonus proxy.
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.w));
  const maxY = Math.max(...rects.map((r) => r.y + r.h));
  const bboxArea = Math.max(1, (maxX - minX) * (maxY - minY));
  const compactnessScore = usedArea / bboxArea;

  // useful rectangular scraps: prefer large clean rectangles.
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
    const esp = item.espessura ?? 19;
    const materialRef = item.materialId ?? item.material;
    const materialRecord = materialRef ? getMaterialByIdOrLabel(String(materialRef)) : null;
    const sheetWidthMm = Number(item.sheetWidthMm ?? materialRecord?.sheetWidthMm);
    const sheetHeightMm = Number(item.sheetHeightMm ?? materialRecord?.sheetHeightMm);
    const sheetThicknessMm = Number(item.sheetThicknessMm ?? materialRecord?.sheetThicknessMm);
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
        espessura_mm: Number(esp) || 19,
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
