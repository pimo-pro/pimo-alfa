/**
 * operationsCost.ts — Custo de operações industriais (peças / furos / cortes).
 */

export type OperationsCostConfig = {
  /** Tempo estimado por peça (min). */
  minutesPerPiece: number;
  /** Tempo estimado por furo (min). */
  minutesPerHole: number;
  /** Tempo estimado por operação de corte (min). */
  minutesPerCutOp: number;
  /** Custo €/min de operação de fábrica (antes do labor dedicado). */
  costPerMinute: number;
};

export type OperationsCostBreakdown = {
  pieceCount: number;
  holeCount: number;
  cutOpCount: number;
  estimatedMinutes: number;
  totalCost: number;
};

export const DEFAULT_OPERATIONS_COST_CONFIG: OperationsCostConfig = {
  minutesPerPiece: 1.5,
  minutesPerHole: 0.15,
  minutesPerCutOp: 0.08,
  costPerMinute: 0.55,
};

export function calculateOperationsCost(
  input: { pieceCount: number; holeCount: number; cutOpCount: number },
  config: OperationsCostConfig = DEFAULT_OPERATIONS_COST_CONFIG
): OperationsCostBreakdown {
  const estimatedMinutes = round2(
    input.pieceCount * config.minutesPerPiece +
      input.holeCount * config.minutesPerHole +
      input.cutOpCount * config.minutesPerCutOp
  );
  const totalCost = round2(estimatedMinutes * config.costPerMinute);
  return {
    pieceCount: input.pieceCount,
    holeCount: input.holeCount,
    cutOpCount: input.cutOpCount,
    estimatedMinutes,
    totalCost,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
