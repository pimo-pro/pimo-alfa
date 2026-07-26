/**
 * overheadCost.ts — Custos operacionais (energia, ferramentas, manutenção, logística).
 */

export type OverheadCostConfig = {
  /** % do custo direto (materiais+ops+cnc+assembly hardware). */
  energyPercent: number;
  toolWearPercent: number;
  maintenancePercent: number;
  logisticsPercent: number;
  /** Fixo € por projeto. */
  fixedPerProject: number;
};

export type OverheadCostBreakdown = {
  baseDirectCost: number;
  energy: number;
  toolWear: number;
  maintenance: number;
  logistics: number;
  fixed: number;
  totalCost: number;
};

export const DEFAULT_OVERHEAD_COST_CONFIG: OverheadCostConfig = {
  energyPercent: 0.035,
  toolWearPercent: 0.02,
  maintenancePercent: 0.025,
  logisticsPercent: 0.03,
  fixedPerProject: 8,
};

export function calculateOverheadCost(
  baseDirectCost: number,
  config: OverheadCostConfig = DEFAULT_OVERHEAD_COST_CONFIG
): OverheadCostBreakdown {
  const base = Math.max(0, baseDirectCost);
  const energy = round2(base * config.energyPercent);
  const toolWear = round2(base * config.toolWearPercent);
  const maintenance = round2(base * config.maintenancePercent);
  const logistics = round2(base * config.logisticsPercent);
  const fixed = round2(config.fixedPerProject);
  return {
    baseDirectCost: round2(base),
    energy,
    toolWear,
    maintenance,
    logistics,
    fixed,
    totalCost: round2(energy + toolWear + maintenance + logistics + fixed),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
