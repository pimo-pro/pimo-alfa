/**
 * laborCost.ts — Mão de obra (hora / operação / projeto).
 */

export type LaborCostConfig = {
  costPerHour: number;
  /** Minutos de mão de obra de projeto além de montagem (setup, QA). */
  projectOverheadMinutes: number;
};

export type LaborCostBreakdown = {
  costPerHour: number;
  assemblyMinutes: number;
  operationsMinutes: number;
  projectOverheadMinutes: number;
  totalMinutes: number;
  costFromAssembly: number;
  costFromOperations: number;
  costFromOverhead: number;
  totalCost: number;
};

export const DEFAULT_LABOR_COST_CONFIG: LaborCostConfig = {
  costPerHour: 28,
  projectOverheadMinutes: 20,
};

export function calculateLaborCost(
  input: {
    assemblyMinutes: number;
    operationsMinutes: number;
  },
  config: LaborCostConfig = DEFAULT_LABOR_COST_CONFIG
): LaborCostBreakdown {
  const perMin = config.costPerHour / 60;
  const projectOverheadMinutes = config.projectOverheadMinutes;
  const totalMinutes = round2(
    input.assemblyMinutes + input.operationsMinutes + projectOverheadMinutes
  );
  const costFromAssembly = round2(input.assemblyMinutes * perMin);
  const costFromOperations = round2(input.operationsMinutes * perMin);
  const costFromOverhead = round2(projectOverheadMinutes * perMin);
  return {
    costPerHour: config.costPerHour,
    assemblyMinutes: input.assemblyMinutes,
    operationsMinutes: input.operationsMinutes,
    projectOverheadMinutes,
    totalMinutes,
    costFromAssembly,
    costFromOperations,
    costFromOverhead,
    totalCost: round2(costFromAssembly + costFromOperations + costFromOverhead),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
