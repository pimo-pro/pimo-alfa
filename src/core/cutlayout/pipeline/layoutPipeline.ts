import type { SeededRng } from "../utils/cutLayoutRng";
import { getSheetSafetyMarginMm } from "../layoutCoordinateSystem";
import type {
  CutPiece,
  CutLayoutEngineOptions,
  CutLayoutProgressEvent,
  CutLayoutMetaHeuristicsOptions,
  CutLayoutResult,
  CutLayoutRotationPreferenceMode,
  CutLayoutScoreModel,
  CutLayoutTrialConfig,
  SheetDefinition,
  SheetResult,
} from "../cutLayoutTypes";
import type { RotationScoringConfig } from "../scoring/rotationScoring";
import type { GlobalScoreMetrics } from "../scoring/solutionMetrics";
import type { SimulateTrialForGroupResult } from "./trialRunner";

const DEFAULT_KERF_MM = 3;
const MIN_UTILIZATION_PERCENT = 0.8;
const DEFAULT_ROTATION_WEIGHT = 0.35;
const DEFAULT_ROTATION_PENALTY = 0.25;
const DEFAULT_ROTATION_MODE: CutLayoutRotationPreferenceMode = "auto";

export function getDefaultTrials(): CutLayoutTrialConfig[] {
  return [
    { strategy: "skyline", binHeuristic: "bestFit" },
    { strategy: "skyline", binHeuristic: "firstFit" },
    { strategy: "shelf", binHeuristic: "bestFit" },
    { strategy: "shelf", binHeuristic: "firstFit" },
    { strategy: "guillotine", binHeuristic: "bestFit" },
    { strategy: "guillotine", binHeuristic: "firstFit" },
  ];
}

export function getDefaultMetaOptions(
  enabledFromFlag: boolean | undefined,
  raw?: CutLayoutMetaHeuristicsOptions
): Required<CutLayoutMetaHeuristicsOptions> {
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

export function isDevRuntime(): boolean {
  if (typeof process !== "undefined" && process?.env) {
    return process.env.NODE_ENV !== "production";
  }
  return true;
}

type PlacementStrategy = "skyline" | "shelf" | "guillotine";
type BinHeuristic = "firstFit" | "bestFit";
type AttemptOrderMode = "area_desc" | "max_side_desc" | "min_side_desc" | "area_desc_soft";

const MAX_NESTING_ATTEMPTS = 4;
const ATTEMPT_TIMEOUT_MS = 1500;
const META_MAX_MULTI_START = 12;
const META_MAX_ITERATIONS = 160;
/** Budget de tempo por grupo de material para a meta-heurística (ms). */
const META_BUDGET_MS = 3500;

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function sortPiecesForAttempt(pieces: CutPiece[], mode: AttemptOrderMode): CutPiece[] {
  const list = pieces.map((p) => ({ ...p }));
  const area = (p: CutPiece) => p.largura_mm * p.altura_mm;
  const maxSide = (p: CutPiece) => Math.max(p.largura_mm, p.altura_mm);
  const minSide = (p: CutPiece) => Math.min(p.largura_mm, p.altura_mm);
  list.sort((a, b) => {
    if (mode === "area_desc") return area(b) - area(a) || maxSide(b) - maxSide(a);
    if (mode === "max_side_desc") return maxSide(b) - maxSide(a) || area(b) - area(a);
    if (mode === "min_side_desc") return minSide(b) - minSide(a) || area(b) - area(a);
    return area(b) - area(a) || minSide(a) - minSide(b);
  });
  return list;
}

/**
 * Transforma furos para o formato TCN-ready no espaço TRO.
 * Para rot=0:  x' = plLargura - hx,  y' = plAltura  - hy  (espelho normal)
 * Para rot=90: x' = plLargura - hx,  y' = plLargura - hy  (ambos usam plLargura)
 * Esta fórmula garante que holeLocalToSheetOffsetMm(h.x, h.y, rot, plLargura)
 * no TCN produz o offset TRO correto para qualquer ângulo.
 */
function computeTcnReadyHoles(
  rotacao: number,
  plLargura: number,
  plAltura: number,
  holes: Array<{ x: number; y: number; diameter: number; depth: number; holeType?: string; topDrillable?: boolean }> | undefined
): Array<{ x: number; y: number; diameter: number; depth: number; holeType?: string; topDrillable?: boolean }> | undefined {
  if (!holes?.length) return holes;
  const r = ((rotacao ?? 0) % 360 + 360) % 360;
  const mirrorY = r === 90 ? plLargura : plAltura;
  return holes.map((h) => ({
    ...h,
    x: Math.max(0, plLargura - Number(h.x ?? 0)),
    y: Math.max(0, mirrorY - Number(h.y ?? 0)),
  }));
}

function normalizeSheetToTopRightOrigin(sheetResult: SheetResult): SheetResult {
  const W = sheetResult.sheet.largura_mm;
  const H = sheetResult.sheet.altura_mm;
  return {
    ...sheetResult,
    placements: sheetResult.placements.map((pl) => ({
      ...pl,
      x_mm: W - (pl.x_mm + pl.largura_mm),
      y_mm: H - (pl.y_mm + pl.altura_mm),
      holes: computeTcnReadyHoles(pl.rotacao, pl.largura_mm, pl.altura_mm, pl.holes),
      drillHoles: computeTcnReadyHoles(pl.rotacao, pl.largura_mm, pl.altura_mm, pl.drillHoles),
      originalDrillHoles: pl.originalDrillHoles ?? pl.drillHoles,
    })),
  };
}

export type RunCutLayoutDeps = {
  expandPieces: (_pieces: CutPiece[]) => CutPiece[];
  groupByMaterialAndThickness: (_pieces: CutPiece[]) => Map<string, CutPiece[]>;
  groupByThicknessOnly: (_pieces: CutPiece[]) => Map<string, CutPiece[]>;
  createUsableSheetArea: (_sheet: SheetDefinition, _marginMm: number) => SheetDefinition;
  applyFixedMarginOffset: (_sheets: SheetResult[], _physicalSheet: SheetDefinition, _marginMm: number) => SheetResult[];
  simulateTrialForGroup: (
    _pieces: CutPiece[],
    _sheet: SheetDefinition,
    _kerf: number,
    _minUtilizationPercent: number,
    _rotationCfg: RotationScoringConfig,
    _trial: CutLayoutTrialConfig,
    _collectDiagnostics: boolean,
    _forceInputOrder?: boolean,
    _scoreModel?: CutLayoutScoreModel
  ) => SimulateTrialForGroupResult;
  cloneSheets: (_sheets: SheetResult[]) => SheetResult[];
  createSeededRng: (_seed: number) => SeededRng;
  shuffleArray: <T>(_arr: T[], _rng: SeededRng) => T[];
  optimizeWithMetaHeuristics: (
    _initialSheets: SheetResult[],
    _sheet: SheetDefinition,
    _kerf: number,
    _minUtilizationPercent: number,
    _rotationCfg: RotationScoringConfig,
    _meta: Required<CutLayoutMetaHeuristicsOptions>,
    _seed?: number,
    _trialPool?: CutLayoutTrialConfig[],
    _scoreModel?: CutLayoutScoreModel,
    _budgetMs?: number
  ) => {
    sheets: SheetResult[];
    diagnostics: {
      iterations: number;
      bestScore: number;
      initialScore: number;
      improvementPercent: number;
      acceptedMoves: number;
      totalMoves: number;
    };
  };
  computeSolutionMetrics: (
    _sheets: SheetResult[],
    _sheet: SheetDefinition,
    _scoreModel?: CutLayoutScoreModel
  ) => GlobalScoreMetrics;
};

export function runCutLayout(
  pieces: CutPiece[],
  sheetDef: SheetDefinition,
  options: CutLayoutEngineOptions | undefined,
  deps: RunCutLayoutDeps
): CutLayoutResult {
  const throwIfAbort = () => {
    if (options?.shouldAbort?.()) {
      const err = new Error("CutLayout aborted");
      err.name = "CutLayoutAbortedError";
      throw err;
    }
  };
  const emitProgress = (event: CutLayoutProgressEvent) => {
    options?.onProgress?.(event);
  };

  throwIfAbort();
  const kerf = options?.kerf_mm ?? DEFAULT_KERF_MM;
  const minUtilizationPercent = options?.minUtilizationPercent ?? MIN_UTILIZATION_PERCENT;
  const rotationCfg: RotationScoringConfig = {
    rotationWeight: options?.rotationWeight ?? DEFAULT_ROTATION_WEIGHT,
    rotationPenalty: options?.rotationPenalty ?? DEFAULT_ROTATION_PENALTY,
    rotationPreferenceMode: options?.rotationPreferenceMode ?? DEFAULT_ROTATION_MODE,
  };

  const grouped = (options?.groupByThicknessOnly ? deps.groupByThicknessOnly : deps.groupByMaterialAndThickness)(
    deps.expandPieces(pieces)
  );
  const trials =
    options?.strategyTrials && options.strategyTrials.length > 0 ? options.strategyTrials : getDefaultTrials();
  const rawMetaCfg = getDefaultMetaOptions(options?.useMetaHeuristics, options?.metaHeuristics);
  const metaCfg: Required<CutLayoutMetaHeuristicsOptions> = {
    ...rawMetaCfg,
    enabled: rawMetaCfg.enabled,
    multiStartCount: Math.min(rawMetaCfg.multiStartCount, META_MAX_MULTI_START),
    iterations: Math.min(rawMetaCfg.iterations, META_MAX_ITERATIONS),
  };
  const scoreModel: CutLayoutScoreModel = options?.scoreModel ?? "legacy";

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

  const groupedEntries = Array.from(grouped.entries());
  const groupCount = Math.max(1, groupedEntries.length);
  emitProgress({ phase: "prepare", groupIndex: 0, groupCount, stepIndex: 0, stepCount: 1, percent: 1 });

  for (let groupIndex = 0; groupIndex < groupedEntries.length; groupIndex++) {
    throwIfAbort();
    const [key, groupPieces] = groupedEntries[groupIndex];
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
    const marginMm = getSheetSafetyMarginMm();
    const placementSheet = deps.createUsableSheetArea(sheet, marginMm);
    const sheetArea = Math.max(1, sheet.largura_mm * sheet.altura_mm);

    let bestRun:
      | (SimulateTrialForGroupResult & {
          strategy: PlacementStrategy;
          binHeuristic: BinHeuristic;
        })
      | null = null;

    const attemptVariants: Array<{
      orderMode: AttemptOrderMode;
      trial: CutLayoutTrialConfig;
      rotationMode: CutLayoutRotationPreferenceMode;
    }> = [
      { orderMode: "area_desc", trial: { strategy: "skyline", binHeuristic: "bestFit" }, rotationMode: "aggressive" },
      { orderMode: "max_side_desc", trial: { strategy: "skyline", binHeuristic: "firstFit" }, rotationMode: "auto" },
      { orderMode: "min_side_desc", trial: { strategy: "shelf", binHeuristic: "bestFit" }, rotationMode: "auto" },
      { orderMode: "area_desc_soft", trial: { strategy: "guillotine", binHeuristic: "firstFit" }, rotationMode: "disabled" },
    ];
    const attempts = attemptVariants
      .map((base, idx) => ({
        ...base,
        trial: trials[idx] ?? base.trial,
      }))
      .slice(0, MAX_NESTING_ATTEMPTS);

    for (let ti = 0; ti < attempts.length; ti++) {
      throwIfAbort();
      const attempt = attempts[ti];
      const trial = attempt.trial;
      const trialPercent = ((groupIndex + (ti + 1) / Math.max(1, attempts.length)) / groupCount) * 60;
      emitProgress({
        phase: "trial",
        groupIndex: groupIndex + 1,
        groupCount,
        stepIndex: ti + 1,
        stepCount: attempts.length,
        percent: Math.min(60, Math.max(1, trialPercent)),
      });
      const attemptStartedAt = nowMs();
      const piecesForAttempt = sortPiecesForAttempt(groupPieces, attempt.orderMode);
      const attemptRotationCfg: RotationScoringConfig = {
        ...rotationCfg,
        rotationPreferenceMode: attempt.rotationMode,
      };
      const run = deps.simulateTrialForGroup(
        piecesForAttempt,
        placementSheet,
        kerf,
        minUtilizationPercent,
        attemptRotationCfg,
        trial,
        Boolean(options?.collectDiagnostics),
        true,
        scoreModel
      );
      const elapsedMs = nowMs() - attemptStartedAt;
      if (elapsedMs > ATTEMPT_TIMEOUT_MS) {
        console.log(`[NESTING] Timeout na tentativa ${ti + 1} — descartada`);
        continue;
      }
      const wasteArea = run.sheets.length * sheetArea - run.usedArea;
      const totalPlacements = run.sheets.reduce((acc, s) => acc + s.placements.length, 0);
      const isValidRun = run.sheets.length > 0 && totalPlacements > 0;
      console.log(`[NESTING] Tentativa ${ti + 1} concluída:`, {
        score: run.score,
        sheets: run.sheets.length,
        placements: totalPlacements,
        usedArea: run.usedArea,
        wasteArea,
        elapsedMs: Number(elapsedMs.toFixed(2)),
        valid: isValidRun,
        strategy: trial.strategy,
        binHeuristic: trial.binHeuristic,
        orderMode: attempt.orderMode,
      });
      if (!isValidRun) {
        continue;
      }
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

    if (!bestRun) {
      const fallbackTrial: CutLayoutTrialConfig = { strategy: "skyline", binHeuristic: "firstFit" };
      const fallbackRun = deps.simulateTrialForGroup(
        groupPieces,
        placementSheet,
        kerf,
        minUtilizationPercent,
        rotationCfg,
        fallbackTrial,
        Boolean(options?.collectDiagnostics),
        false,
        scoreModel
      );
      const fallbackPlacements = fallbackRun.sheets.reduce((acc, s) => acc + s.placements.length, 0);
      if (fallbackRun.sheets.length > 0 && fallbackPlacements > 0) {
        bestRun = {
          ...fallbackRun,
          strategy: fallbackTrial.strategy,
          binHeuristic: fallbackTrial.binHeuristic,
        };
      } else {
        continue;
      }
    }

    if (metaCfg.enabled && bestRun.sheets.length > 0) {
      const baselineRefScore = bestRun.score;
      const startCount = metaCfg.multiStartCount;
      let globalBestSheets = deps.cloneSheets(bestRun.sheets);
      let globalBestScore = bestRun.score;
      let globalAcceptedMoves = 0;
      let winningSeed = metaCfg.seedBase;
      let winningStrategy: PlacementStrategy = bestRun.strategy;
      let winningBin: BinHeuristic = bestRun.binHeuristic;

      const strategyPool: CutLayoutTrialConfig[] = [
        { strategy: "skyline", binHeuristic: "firstFit" },
        { strategy: "skyline", binHeuristic: "bestFit" },
        { strategy: "shelf", binHeuristic: "firstFit" },
        { strategy: "shelf", binHeuristic: "bestFit" },
        { strategy: "guillotine", binHeuristic: "firstFit" },
        { strategy: "guillotine", binHeuristic: "bestFit" },
      ];

      const metaGroupStartMs = nowMs();
      for (let si = 0; si < startCount; si++) {
        throwIfAbort();
        if (nowMs() - metaGroupStartMs > META_BUDGET_MS) break;
        const metaPercent =
          60 + (((groupIndex + (si + 1) / Math.max(1, startCount)) / groupCount) * 35);
        emitProgress({
          phase: "meta",
          groupIndex: groupIndex + 1,
          groupCount,
          stepIndex: si + 1,
          stepCount: startCount,
          percent: Math.min(95, Math.max(60, metaPercent)),
        });
        const seed = metaCfg.seedBase + si;
        const rng = deps.createSeededRng(seed);
        const initialTrial = strategyPool[rng.int(strategyPool.length)];
        const shuffledPieces = deps.shuffleArray(groupPieces, rng);
        const rotationModes: CutLayoutRotationPreferenceMode[] = ["aggressive", "auto", "disabled"];
        const seededRotationCfg: RotationScoringConfig = {
          ...rotationCfg,
          rotationPreferenceMode: rotationModes[rng.int(rotationModes.length)],
        };

        const seededRun = deps.simulateTrialForGroup(
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
        const remainingBudget = Math.max(200, META_BUDGET_MS - (nowMs() - metaGroupStartMs));
        const local = deps.optimizeWithMetaHeuristics(
          startSheets,
          placementSheet,
          kerf,
          minUtilizationPercent,
          seededRotationCfg,
          metaCfg,
          seed,
          strategyPool,
          scoreModel,
          remainingBudget
        );
        const localScore = deps.computeSolutionMetrics(local.sheets, placementSheet, scoreModel).score;
        globalAcceptedMoves += local.diagnostics.acceptedMoves;
        if (localScore < globalBestScore) {
          globalBestScore = localScore;
          globalBestSheets = deps.cloneSheets(local.sheets);
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
        const advanced = deps.computeSolutionMetrics(globalBestSheets, placementSheet, scoreModel).advanced;
        diagnostics.metaHeuristics = {
          iterations: metaCfg.iterations * startCount,
          bestScore: Math.min(baselineRefScore, globalBestScore),
          initialScore: baselineRefScore,
          improvementPercent:
            baselineRefScore > 0
              ? Number(
                  (
                    ((baselineRefScore - Math.min(baselineRefScore, globalBestScore)) / baselineRefScore) *
                    100
                  ).toFixed(3)
                )
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
    const offsetSheets = deps.applyFixedMarginOffset(bestRun.sheets, sheet, marginMm);
    const normalizedSheets = options?.originTopRight
      ? offsetSheets.map((s) => normalizeSheetToTopRightOrigin(s))
      : offsetSheets;
    finalSheets.push(...normalizedSheets);
  }

  emitProgress({ phase: "finalize", groupIndex: groupCount, groupCount, stepIndex: 1, stepCount: 1, percent: 100 });
  return diagnostics ? { sheets: finalSheets, diagnostics } : { sheets: finalSheets };
}
