import type { CutLayoutEngineOptions } from "../cutlayout/cutLayoutTypes";

/**
 * Cópia segura para `postMessage` (sem funções). Preserva campos usados pelo nesting industrial.
 */
export function cloneSerializableCutLayoutEngineOptions(o: CutLayoutEngineOptions): CutLayoutEngineOptions {
  const m = o.metaHeuristics;
  return {
    sheetLargura_mm: o.sheetLargura_mm,
    sheetAltura_mm: o.sheetAltura_mm,
    kerf_mm: o.kerf_mm,
    minUtilizationPercent: o.minUtilizationPercent,
    rotationWeight: o.rotationWeight,
    rotationPenalty: o.rotationPenalty,
    rotationPreferenceMode: o.rotationPreferenceMode,
    collectDiagnostics: o.collectDiagnostics,
    groupByThicknessOnly: o.groupByThicknessOnly,
    strategyTrials: o.strategyTrials?.map((t) => ({ ...t })),
    useMetaHeuristics: o.useMetaHeuristics,
    metaHeuristics: m
      ? {
          enabled: m.enabled,
          iterations: m.iterations,
          initialTemperature: m.initialTemperature,
          coolingRate: m.coolingRate,
          lnsDestroyRatio: m.lnsDestroyRatio,
          multiStartCount: m.multiStartCount,
          seedBase: m.seedBase,
        }
      : undefined,
    scoreModel: o.scoreModel,
    originTopRight: o.originTopRight,
    nestingEngine: o.nestingEngine,
    kerf_mm_floor: o.kerf_mm_floor,
    margin_mm_floor: o.margin_mm_floor,
  };
}
