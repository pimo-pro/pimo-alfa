/**
 * cncCost.ts — Custo CNC a partir de operações CUT/DRILL (Fase 17, somente leitura).
 */

export type CncCostConfig = {
  costPerCutOp: number;
  costPerDrillOp: number;
  costPerToolChange: number;
  /** Trocas de ferramenta estimadas por N drills. */
  drillsPerToolChange: number;
  machineCostPerMinute: number;
  minutesPerCutOp: number;
  minutesPerDrillOp: number;
};

export type CncCostBreakdown = {
  cutOps: number;
  drillOps: number;
  toolChanges: number;
  machineMinutes: number;
  cutCost: number;
  drillCost: number;
  toolChangeCost: number;
  machineTimeCost: number;
  totalCost: number;
};

export const DEFAULT_CNC_COST_CONFIG: CncCostConfig = {
  costPerCutOp: 0.12,
  costPerDrillOp: 0.08,
  costPerToolChange: 1.5,
  drillsPerToolChange: 40,
  machineCostPerMinute: 0.85,
  minutesPerCutOp: 0.06,
  minutesPerDrillOp: 0.12,
};

export function calculateCncCost(
  input: { cutOps: number; drillOps: number },
  config: CncCostConfig = DEFAULT_CNC_COST_CONFIG
): CncCostBreakdown {
  const cutOps = Math.max(0, input.cutOps);
  const drillOps = Math.max(0, input.drillOps);
  const toolChanges =
    drillOps > 0
      ? Math.max(1, Math.ceil(drillOps / Math.max(1, config.drillsPerToolChange)))
      : 0;

  const machineMinutes = round2(
    cutOps * config.minutesPerCutOp + drillOps * config.minutesPerDrillOp
  );
  const cutCost = round2(cutOps * config.costPerCutOp);
  const drillCost = round2(drillOps * config.costPerDrillOp);
  const toolChangeCost = round2(toolChanges * config.costPerToolChange);
  const machineTimeCost = round2(machineMinutes * config.machineCostPerMinute);
  const totalCost = round2(cutCost + drillCost + toolChangeCost + machineTimeCost);

  return {
    cutOps,
    drillOps,
    toolChanges,
    machineMinutes,
    cutCost,
    drillCost,
    toolChangeCost,
    machineTimeCost,
    totalCost,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
