/**
 * Global Run Optimizer — Nesting Engine 2.3
 *
 * Executa múltiplos candidatos de nesting com ordens de peças e estratégias
 * diferentes, avalia cada um com uma função de score global e devolve o melhor.
 *
 * A função de score global penaliza especificamente:
 *   - desperdício total (base)
 *   - chapa com maior desperdício individual (×3 da área)
 *   - número de chapas com desperdício > 25%     (×2 da área)
 *   - bolsões grandes nas chapas tardias          (×0.5 da área)
 *
 * Puro: sem efeitos colaterais no pipeline TCN.
 * Contrato de dados para TCN inalterado.
 */

import type {
  CutPiece,
  SheetDefinition,
  SheetResult,
  CutLayoutTrialConfig,
  CutLayoutScoreModel,
  CutLayoutRotationPreferenceMode,
} from "../cutLayoutTypes";
import type { RotationScoringConfig } from "../scoring/rotationScoring";
import type { SimulateTrialForGroupResult } from "../pipeline/trialRunner";

/** Timeout máximo por run candidato (ms). */
const GRO_ATTEMPT_TIMEOUT_MS = 1500;

/** Limiar de desperdício "alto" por chapa para penalização. */
const HIGH_WASTE_THRESHOLD = 0.25;

type OrderMode = "area_desc" | "max_side_desc" | "min_side_desc" | "aspect_ratio_desc";

type GlobalRunConfig = {
  orderMode: OrderMode;
  trial: CutLayoutTrialConfig;
  rotationMode: CutLayoutRotationPreferenceMode;
  label: string;
};

export type GlobalRunCandidate = {
  run: SimulateTrialForGroupResult;
  globalScore: number;
  config: GlobalRunConfig;
  metrics: {
    totalWaste: number;
    /** Rácio de desperdício na chapa com mais desperdício (0–1). */
    maxSheetWasteRatio: number;
    /** Número de chapas com desperdício > 25%. */
    numSheetsAbove25pct: number;
    largeVoidPocketsTotal: number;
  };
};

export type GlobalRunOptimizerDeps = {
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
};

/**
 * Conjunto fixo de candidatos testados pelo otimizador.
 * Cada config combina ordenação de peças + estratégia de packing + modo de rotação.
 */
const GLOBAL_RUN_CONFIGS: GlobalRunConfig[] = [
  {
    orderMode: "area_desc",
    trial: { strategy: "skyline", binHeuristic: "bestFit" },
    rotationMode: "aggressive",
    label: "skyline/bestFit/area/aggressive",
  },
  {
    orderMode: "max_side_desc",
    trial: { strategy: "skyline", binHeuristic: "bestFit" },
    rotationMode: "auto",
    label: "skyline/bestFit/maxSide/auto",
  },
  {
    orderMode: "area_desc",
    trial: { strategy: "shelf", binHeuristic: "bestFit" },
    rotationMode: "auto",
    label: "shelf/bestFit/area/auto",
  },
  {
    orderMode: "max_side_desc",
    trial: { strategy: "guillotine", binHeuristic: "bestFit" },
    rotationMode: "auto",
    label: "guillotine/bestFit/maxSide/auto",
  },
  {
    orderMode: "min_side_desc",
    trial: { strategy: "skyline", binHeuristic: "firstFit" },
    rotationMode: "aggressive",
    label: "skyline/firstFit/minSide/aggressive",
  },
  {
    orderMode: "aspect_ratio_desc",
    trial: { strategy: "shelf", binHeuristic: "bestFit" },
    rotationMode: "auto",
    label: "shelf/bestFit/aspect/auto",
  },
];

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function sortPieces(pieces: CutPiece[], mode: OrderMode): CutPiece[] {
  const list = [...pieces];
  const area = (p: CutPiece) => p.largura_mm * p.altura_mm;
  const maxSide = (p: CutPiece) => Math.max(p.largura_mm, p.altura_mm);
  const minSide = (p: CutPiece) => Math.min(p.largura_mm, p.altura_mm);
  const aspectRatio = (p: CutPiece) => maxSide(p) / Math.max(1, minSide(p));
  switch (mode) {
    case "area_desc":
      list.sort((a, b) => area(b) - area(a) || maxSide(b) - maxSide(a));
      break;
    case "max_side_desc":
      list.sort((a, b) => maxSide(b) - maxSide(a) || area(b) - area(a));
      break;
    case "min_side_desc":
      list.sort((a, b) => minSide(b) - minSide(a) || area(b) - area(a));
      break;
    case "aspect_ratio_desc":
      list.sort((a, b) => aspectRatio(b) - aspectRatio(a) || area(b) - area(a));
      break;
  }
  return list;
}

function computeGlobalScore(
  sheets: SheetResult[],
  sheetArea: number,
  largeVoidPocketsTotal: number
): { globalScore: number; metrics: GlobalRunCandidate["metrics"] } {
  if (sheets.length === 0) {
    return {
      globalScore: Number.MAX_SAFE_INTEGER,
      metrics: { totalWaste: 0, maxSheetWasteRatio: 0, numSheetsAbove25pct: 0, largeVoidPocketsTotal: 0 },
    };
  }

  const sheetWastes = sheets.map((s) => {
    const used = s.placements.reduce((acc, p) => acc + p.largura_mm * p.altura_mm, 0);
    return Math.max(0, (sheetArea - used) / sheetArea);
  });

  const totalWaste =
    sheets.length * sheetArea -
    sheets.reduce((acc, s) => acc + s.placements.reduce((a, p) => a + p.largura_mm * p.altura_mm, 0), 0);

  const maxSheetWasteRatio = Math.max(...sheetWastes);
  const numSheetsAbove25pct = sheetWastes.filter((w) => w > HIGH_WASTE_THRESHOLD).length;

  // Penalização forte nas chapas com muito desperdício e nos bolsões tardios.
  const globalScore =
    totalWaste +
    maxSheetWasteRatio * sheetArea * 3.0 +
    numSheetsAbove25pct * sheetArea * 2.0 +
    largeVoidPocketsTotal * sheetArea * 0.5;

  return {
    globalScore,
    metrics: { totalWaste, maxSheetWasteRatio, numSheetsAbove25pct, largeVoidPocketsTotal },
  };
}

/**
 * Executa múltiplos runs candidatos e devolve o com melhor score global.
 *
 * Cada candidato usa uma combinação diferente de:
 *   - ordenação de peças (area_desc / max_side_desc / min_side_desc / aspect_ratio_desc)
 *   - estratégia de packing (skyline / shelf / guillotine)
 *   - modo de rotação (aggressive / auto / disabled)
 *
 * O melhor candidato é o que minimiza a função de score global, que penaliza
 * desperdício total, chapa mais desperdiçada e chapas acima de 25% de desperdício.
 *
 * @param pieces                Peças do grupo (já expandidas, quantidade=1).
 * @param sheet                 Definição de chapa.
 * @param kerf                  Espessura de corte em mm.
 * @param minUtilizationPercent Utilização mínima por chapa.
 * @param rotationCfg           Configuração de rotação base (modo pode ser sobreposto por config).
 * @param scoreModel            Modelo de score interno do nesting.
 * @param deps                  Dependências injetadas (simulateTrialForGroup).
 */
export function runGlobalOptimizer(
  pieces: CutPiece[],
  sheet: SheetDefinition,
  kerf: number,
  minUtilizationPercent: number,
  rotationCfg: RotationScoringConfig,
  scoreModel: CutLayoutScoreModel,
  deps: GlobalRunOptimizerDeps
): GlobalRunCandidate | null {
  if (pieces.length === 0) return null;

  const sheetArea = Math.max(1, sheet.largura_mm * sheet.altura_mm);
  let best: GlobalRunCandidate | null = null;

  for (const cfg of GLOBAL_RUN_CONFIGS) {
    const startMs = nowMs();
    const sorted = sortPieces(pieces, cfg.orderMode);
    const runRotationCfg: RotationScoringConfig = {
      ...rotationCfg,
      rotationPreferenceMode: cfg.rotationMode,
    };

    const run = deps.simulateTrialForGroup(
      sorted,
      sheet,
      kerf,
      minUtilizationPercent,
      runRotationCfg,
      cfg.trial,
      false,
      true,
      scoreModel
    );

    const elapsed = nowMs() - startMs;
    if (elapsed > GRO_ATTEMPT_TIMEOUT_MS) {
      console.log(`[GRO] Timeout em "${cfg.label}" (${elapsed.toFixed(0)}ms) — descartado`);
      continue;
    }

    const totalPlacements = run.sheets.reduce((acc, s) => acc + s.placements.length, 0);
    if (run.sheets.length === 0 || totalPlacements === 0) continue;

    // largeVoidPocketsTotal vem de run.advanced (calculado por computeSolutionMetrics dentro do trial)
    const largeVoidPockets = run.advanced?.largeVoidPocketsTotal ?? 0;
    const { globalScore, metrics } = computeGlobalScore(run.sheets, sheetArea, largeVoidPockets);

    console.log(
      `[GRO] "${cfg.label}": globalScore=${globalScore.toFixed(0)} | maxWaste=${(metrics.maxSheetWasteRatio * 100).toFixed(1)}% | sheetsAbove25%=${metrics.numSheetsAbove25pct} | sheets=${run.sheets.length}`
    );

    if (!best || globalScore < best.globalScore) {
      best = { run, globalScore, config: cfg, metrics };
    }
  }

  if (best) {
    console.log(
      `[GRO] Vencedor: "${best.config.label}" | globalScore=${best.globalScore.toFixed(0)} | maxWaste=${(best.metrics.maxSheetWasteRatio * 100).toFixed(1)}%`
    );
  }

  return best;
}
