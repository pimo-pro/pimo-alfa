import type { CutLayoutTrialConfig, CutPiece, CutPlacement, SheetDefinition, SheetResult } from "../cutLayoutTypes";
import type { PlacementCandidate, RotationScoringConfig } from "../scoring/rotationScoring";
import type { GlobalScoreMetrics } from "../scoring/solutionMetrics";

const MAIN_SEARCH_WINDOW = 48;

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
  reorderPieces: (_pieces: CutPiece[], _mode: "production" | "gapFill") => CutPiece[];
  initStrategyState: (_strategy: CutLayoutTrialConfig["strategy"], _sheet: SheetDefinition) => StrategyState;
  pickBestPieceForSheet: (
    _remaining: CutPiece[],
    _sheet: SheetDefinition,
    _strategy: CutLayoutTrialConfig["strategy"],
    _state: StrategyState,
    _placedRects: PlacedRect[],
    _kerf: number,
    _searchWindow: number,
    _rotationCfg: RotationScoringConfig,
    _bin: CutLayoutTrialConfig["binHeuristic"]
  ) => { index: number; placement: PlacementCandidate } | null;
  isInsideSheet: (_x: number, _y: number, _w: number, _h: number, _sheet: SheetDefinition) => boolean;
  updateStrategyState: (
    _strategy: CutLayoutTrialConfig["strategy"],
    _state: StrategyState,
    _placement: PlacementCandidate,
    _kerf: number
  ) => StrategyState;
  findPlacementForPiece: (
    _piece: CutPiece,
    _strategy: CutLayoutTrialConfig["strategy"],
    _sheet: SheetDefinition,
    _placedRects: PlacedRect[],
    _state: StrategyState,
    _kerf: number,
    _rotationCfg: RotationScoringConfig,
    _bin: CutLayoutTrialConfig["binHeuristic"]
  ) => PlacementCandidate | null;
  calculateSheetUtilization: (_placedRects: PlacedRect[], _sheetW: number, _sheetH: number) => number;
  optimizeLastSheetLocally: (_sheets: SheetResult[], _sheet: SheetDefinition, _kerf: number, _scoreModel: ScoreModel) => SheetResult[];
  computeSolutionMetrics: (_sheets: SheetResult[], _sheet: SheetDefinition, _scoreModel: ScoreModel) => GlobalScoreMetrics;
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
      if (!best) {
        // Segunda tentativa: janela completa para não deixar peças que cabem
        const rescue2 = deps.pickBestPieceForSheet(
          remaining,
          sheet,
          trial.strategy,
          state,
          placedRects,
          kerf,
          remaining.length, // janela total
          rotationCfg,
          "bestFit"
        );
        if (!rescue2) break;
        // continua com rescue2 como best
        const piece2 = remaining[rescue2.index];
        if (!deps.isInsideSheet(rescue2.placement.x, rescue2.placement.y, rescue2.placement.w, rescue2.placement.h, sheet))
          break;
        placements.push({
          x_mm: rescue2.placement.x,
          y_mm: rescue2.placement.y,
          largura_mm: rescue2.placement.w,
          altura_mm: rescue2.placement.h,
          espessura_mm: piece2.espessura_mm,
          rotacao: rescue2.placement.rotation,
          sheetIndex,
          boxId: piece2.boxId,
          partName: piece2.partName,
          materialId: piece2.materialId,
          materialName: piece2.materialName,
          drillHoles: piece2.drillHoles ?? piece2.holes,
          holes: piece2.holes,
          originalDrillHoles: piece2.originalDrillHoles ?? piece2.drillHoles ?? piece2.holes,
          pieceNumber: piece2.pieceNumber,
          shortCode: piece2.shortCode,
          metadata: piece2.metadata,
        });
        placedRects.push({ x: rescue2.placement.x, y: rescue2.placement.y, w: rescue2.placement.w, h: rescue2.placement.h });
        state = deps.updateStrategyState(trial.strategy, state, rescue2.placement, kerf);
        remaining.splice(rescue2.index, 1);
        continue;
      }

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
        espessura_mm: piece.espessura_mm,
        rotacao: best.placement.rotation,
        sheetIndex,
        boxId: piece.boxId,
        partName: piece.partName,
        materialId: piece.materialId,
        materialName: piece.materialName,
        drillHoles: piece.drillHoles ?? piece.holes,
        holes: piece.holes,
        originalDrillHoles: piece.originalDrillHoles ?? piece.drillHoles ?? piece.holes,
        pieceNumber: piece.pieceNumber,
        shortCode: piece.shortCode,
        metadata: piece.metadata,
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
          espessura_mm: target.espessura_mm,
          rotacao: fit.rotation,
          sheetIndex,
          boxId: target.boxId,
          partName: target.partName,
          materialId: target.materialId,
          materialName: target.materialName,
          drillHoles: target.drillHoles ?? target.holes,
          holes: target.holes,
          originalDrillHoles: target.originalDrillHoles ?? target.drillHoles ?? target.holes,
          pieceNumber: target.pieceNumber,
          shortCode: target.shortCode,
          metadata: target.metadata,
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

      // Segunda passagem gap fill: tenta peças restantes por ordem de área decrescente
      const gapOrdered2 = [...remaining].sort(
        (a, b) => b.largura_mm * b.altura_mm - a.largura_mm * a.altura_mm
      );
      for (let i = 0; i < gapOrdered2.length; i++) {
        const target = gapOrdered2[i];
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
          espessura_mm: target.espessura_mm,
          rotacao: fit.rotation,
          sheetIndex,
          boxId: target.boxId,
          partName: target.partName,
          materialId: target.materialId,
          materialName: target.materialName,
          drillHoles: target.drillHoles ?? target.holes,
          holes: target.holes,
          originalDrillHoles: target.originalDrillHoles ?? target.drillHoles ?? target.holes,
          pieceNumber: target.pieceNumber,
          shortCode: target.shortCode,
          metadata: target.metadata,
        });
        placedRects.push({ x: fit.x, y: fit.y, w: fit.w, h: fit.h });
        state = deps.updateStrategyState(trial.strategy, state, fit, kerf);
        remaining.splice(originalIndex, 1);
      }
    }

    if (remaining.length > 0) {
      const util = deps.calculateSheetUtilization(placedRects, sheet.largura_mm, sheet.altura_mm);
      if (util < minUtilizationPercent) {
        rescueAttempts += 1;
        let moreToRescue = true;
        while (moreToRescue && remaining.length > 0) {
          moreToRescue = false;
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
              espessura_mm: piece.espessura_mm,
              rotacao: rescue.placement.rotation,
              sheetIndex,
              boxId: piece.boxId,
              partName: piece.partName,
              materialId: piece.materialId,
              materialName: piece.materialName,
              drillHoles: piece.drillHoles ?? piece.holes,
              holes: piece.holes,
              originalDrillHoles: piece.originalDrillHoles ?? piece.drillHoles ?? piece.holes,
              pieceNumber: piece.pieceNumber,
              shortCode: piece.shortCode,
              metadata: piece.metadata,
            });
            placedRects.push({
              x: rescue.placement.x,
              y: rescue.placement.y,
              w: rescue.placement.w,
              h: rescue.placement.h,
            });
            state = deps.updateStrategyState(trial.strategy, state, rescue.placement, kerf);
            remaining.splice(rescue.index, 1);
            moreToRescue = true;
          }
        }
      }
    }

    // Proteção: chapas com waste < 10% não são candidatas a repack
    const sheetUtil = deps.calculateSheetUtilization(placedRects, sheet.largura_mm, sheet.altura_mm);
    const isExcellent = sheetUtil >= 0.9; // waste < 10%
    sheets.push({
      sheet: { ...sheet },
      placements,
      ...(isExcellent ? { protected: true } : {}),
    } as SheetResult);
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
