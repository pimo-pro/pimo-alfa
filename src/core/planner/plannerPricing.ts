/**
 * plannerPricing.ts — Preço em tempo real (consome IndustrialPricing, sem recalcular).
 */

import type { IndustrialPricing } from "../pricing";
import type { PlannerPlacedModule } from "./plannerModules";

export type PlannerPricingSummary = {
  currency: string;
  moduleCount: number;
  drawerCount: number;
  costPerModule: number;
  pricePerModule: number;
  costPerDrawer: number;
  pricePerDrawer: number;
  costIndustrial: number;
  priceFinal: number;
  marginPercent: number;
  marginAmount: number;
  status?: string;
  source: "library-pricing" | "empty";
};

/**
 * Agrega preço a partir do pricing da Kitchen Library / amostra.
 * Multiplica unitários × módulos colocados — sem rebuild industrial.
 */
export function buildPlannerPricing(
  placed: PlannerPlacedModule[],
  libraryPricing?: IndustrialPricing | null
): PlannerPricingSummary {
  if (!libraryPricing) {
    return {
      currency: "EUR",
      moduleCount: placed.length,
      drawerCount: placed.reduce((s, m) => s + m.drawerCount, 0),
      costPerModule: 0,
      pricePerModule: 0,
      costPerDrawer: 0,
      pricePerDrawer: 0,
      costIndustrial: 0,
      priceFinal: 0,
      marginPercent: 0,
      marginAmount: 0,
      source: "empty",
    };
  }

  const drawerCount = placed.reduce((s, m) => s + m.drawerCount, 0);
  const costPerModule = libraryPricing.totals.costPerModule;
  const pricePerModule = libraryPricing.totals.pricePerModule;
  const costPerDrawer = libraryPricing.totals.costPerDrawer;
  const pricePerDrawer = libraryPricing.totals.pricePerDrawer;
  const marginPercent = libraryPricing.margin.marginPercent;

  const priceFinal = round2(placed.length === 0 ? 0 : pricePerModule * placed.length);
  const costIndustrial = round2(placed.length === 0 ? 0 : costPerModule * placed.length);
  const marginAmount = round2(priceFinal - costIndustrial);

  return {
    currency: libraryPricing.currency,
    moduleCount: placed.length,
    drawerCount,
    costPerModule,
    pricePerModule,
    costPerDrawer,
    pricePerDrawer,
    costIndustrial,
    priceFinal,
    marginPercent,
    marginAmount,
    status: libraryPricing.report.status,
    source: "library-pricing",
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
