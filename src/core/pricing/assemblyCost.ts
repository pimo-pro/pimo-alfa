/**
 * assemblyCost.ts — Custo de montagem e ferragens.
 */

export type AssemblyCostConfig = {
  minutesPerDrawer: number;
  minutesPerModule: number;
  hardwareCostPerDrawer: number;
  laborCostPerMinute: number;
};

export type AssemblyCostBreakdown = {
  drawerCount: number;
  moduleCount: number;
  assemblyMinutes: number;
  hardwareCost: number;
  laborCost: number;
  totalCost: number;
};

export const DEFAULT_ASSEMBLY_COST_CONFIG: AssemblyCostConfig = {
  minutesPerDrawer: 18,
  minutesPerModule: 12,
  hardwareCostPerDrawer: 22,
  laborCostPerMinute: 0.45,
};

export function calculateAssemblyCost(
  input: { drawerCount: number; moduleCount?: number },
  config: AssemblyCostConfig = DEFAULT_ASSEMBLY_COST_CONFIG
): AssemblyCostBreakdown {
  const drawerCount = Math.max(1, input.drawerCount);
  const moduleCount = Math.max(1, input.moduleCount ?? 1);
  const assemblyMinutes = round2(
    drawerCount * config.minutesPerDrawer + moduleCount * config.minutesPerModule
  );
  const hardwareCost = round2(drawerCount * config.hardwareCostPerDrawer);
  const laborCost = round2(assemblyMinutes * config.laborCostPerMinute);
  return {
    drawerCount,
    moduleCount,
    assemblyMinutes,
    hardwareCost,
    laborCost,
    totalCost: round2(hardwareCost + laborCost),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
