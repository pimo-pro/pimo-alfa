/**
 * marginCalculator.ts — Margem e preço final.
 */

export type MarginConfig = {
  /** Margem fracionária (ex.: 0.30 = 30%). */
  marginPercent: number;
};

export type MarginBreakdown = {
  industrialCost: number;
  marginPercent: number;
  marginAmount: number;
  priceFinal: number;
  pricePerDrawer: number;
  pricePerModule: number;
};

export const DEFAULT_MARGIN_CONFIG: MarginConfig = {
  marginPercent: 0.3,
};

export function calculateMarginAndPrice(
  input: {
    industrialCost: number;
    drawerCount: number;
    moduleCount: number;
  },
  config: MarginConfig = DEFAULT_MARGIN_CONFIG
): MarginBreakdown {
  const marginPercent = Math.min(0.9, Math.max(0, config.marginPercent));
  const industrialCost = round2(Math.max(0, input.industrialCost));
  const marginAmount = round2(industrialCost * marginPercent);
  const priceFinal = round2(industrialCost + marginAmount);
  const drawerCount = Math.max(1, input.drawerCount);
  const moduleCount = Math.max(1, input.moduleCount);
  return {
    industrialCost,
    marginPercent,
    marginAmount,
    priceFinal,
    pricePerDrawer: round2(priceFinal / drawerCount),
    pricePerModule: round2(priceFinal / moduleCount),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
