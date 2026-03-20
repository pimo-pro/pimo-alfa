import type { SeededRng } from "../utils/cutLayoutRng";
import { CUT_LAYOUT_SAFETY_MARGIN_MM } from "../layoutCoordinateSystem";
import type {
  CutPiece,
  CutLayoutEngineOptions,
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
    _scoreModel?: CutLayoutScoreModel
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
  const metaCfg = getDefaultMetaOptions(options?.useMetaHeuristics, options?.metaHeuristics);
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
    const placementSheet = deps.createUsableSheetArea(sheet, marginMm);
    const sheetArea = Math.max(1, sheet.largura_mm * sheet.altura_mm);

    let bestRun:
      | (SimulateTrialForGroupResult & {
          strategy: PlacementStrategy;
          binHeuristic: BinHeuristic;
        })
      | null = null;

    for (const trial of trials) {
      const run = deps.simulateTrialForGroup(
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

      for (let si = 0; si < startCount; si++) {
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
        const local = deps.optimizeWithMetaHeuristics(
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
    finalSheets.push(...deps.applyFixedMarginOffset(bestRun.sheets, sheet, marginMm));
  }

  return diagnostics ? { sheets: finalSheets, diagnostics } : { sheets: finalSheets };
}
