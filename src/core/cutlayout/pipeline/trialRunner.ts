import type { CutLayoutTrialConfig, CutPiece, CutPlacement, SheetDefinition, SheetResult } from "../cutLayoutTypes";
import type { PlacementCandidate, RotationScoringConfig } from "../scoring/rotationScoring";
import type { GlobalScoreMetrics } from "../scoring/solutionMetrics";

const MAIN_SEARCH_WINDOW = 32;

type PlacedRect = { x: number; y: number; w: number; h: number };
type ScoreModel = "legacy" | "v32";

type StrategyState = unknown;

export type SimulateTrialForGroupResult = {
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
};

export type SimulateTrialForGroupDeps = {
  reorderPieces: (pieces: CutPiece[], mode: "production" | "gapFill") => CutPiece[];
  initStrategyState: (strategy: CutLayoutTrialConfig["strategy"], sheet: SheetDefinition) => StrategyState;
  pickBestPieceForSheet: (
    remaining: CutPiece[],
    sheet: SheetDefinition,
    strategy: CutLayoutTrialConfig["strategy"],
    state: StrategyState,
    placedRects: PlacedRect[],
    kerf: number,
    searchWindow: number,
    rotationCfg: RotationScoringConfig,
    bin: CutLayoutTrialConfig["binHeuristic"]
  ) => { index: number; placement: PlacementCandidate } | null;
  isInsideSheet: (x: number, y: number, w: number, h: number, sheet: SheetDefinition) => boolean;
  updateStrategyState: (
    strategy: CutLayoutTrialConfig["strategy"],
    state: StrategyState,
    placement: PlacementCandidate,
    kerf: number
  ) => StrategyState;
  findPlacementForPiece: (
    piece: CutPiece,
    strategy: CutLayoutTrialConfig["strategy"],
    sheet: SheetDefinition,
    placedRects: PlacedRect[],
    state: StrategyState,
    kerf: number,
    rotationCfg: RotationScoringConfig,
    bin: CutLayoutTrialConfig["binHeuristic"]
  ) => PlacementCandidate | null;
  calculateSheetUtilization: (placedRects: PlacedRect[], sheetW: number, sheetH: number) => number;
  optimizeLastSheetLocally: (sheets: SheetResult[], sheet: SheetDefinition, kerf: number, scoreModel: ScoreModel) => SheetResult[];
  computeSolutionMetrics: (sheets: SheetResult[], sheet: SheetDefinition, scoreModel: ScoreModel) => GlobalScoreMetrics;
};

export function simulateTrialForGroup(
  pieces: CutPiece[],
  sheet: SheetDefinition,
  kerf: number,
  minUtilizationPercent: number,
  rotationCfg: RotationScoringConfig,
  trial: CutLayoutTrialConfig,
  collectDiagnostics: boolean,
  forceInputOrder: boolean,
  scoreModel: ScoreModel,
  deps: SimulateTrialForGroupDeps
): SimulateTrialForGroupResult {
  const remaining = forceInputOrder ? pieces.map((p) => ({ ...p })) : deps.reorderPieces(pieces, "production");
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
    let state = deps.initStrategyState(trial.strategy, sheet);
    const sheetIndex = sheets.length;

    while (remaining.length > 0) {
      const best = deps.pickBestPieceForSheet(
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
      if (!deps.isInsideSheet(best.placement.x, best.placement.y, best.placement.w, best.placement.h, sheet)) {
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
      state = deps.updateStrategyState(trial.strategy, state, best.placement, kerf);
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
      const gapOrdered = deps.reorderPieces(remaining, "gapFill");
      for (let i = 0; i < gapOrdered.length; i++) {
        const target = gapOrdered[i];
        const originalIndex = remaining.findIndex((r) => r === target);
        if (originalIndex < 0) continue;
        const fit = deps.findPlacementForPiece(
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
        state = deps.updateStrategyState(trial.strategy, state, fit, kerf);
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
      const util = deps.calculateSheetUtilization(placedRects, sheet.largura_mm, sheet.altura_mm);
      if (util < minUtilizationPercent) {
        rescueAttempts += 1;
        const rescue = deps.pickBestPieceForSheet(
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
          state = deps.updateStrategyState(trial.strategy, state, rescue.placement, kerf);
          remaining.splice(rescue.index, 1);
        }
      }
    }

    sheets.push({
      sheet: { ...sheet },
      placements,
    });
  }

  const optimizedSheets = deps.optimizeLastSheetLocally(sheets, sheet, kerf, scoreModel);
  const metrics = deps.computeSolutionMetrics(optimizedSheets, sheet, scoreModel);

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
