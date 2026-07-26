/**
 * pricingBuilder.ts — Constrói IndustrialPricing a partir de result Modelo B (somente leitura).
 */

import type { EuropeanDrawerResult } from "../drawers/european/types";
import { buildEuropeanCncPrograms } from "../drawers/european/cnc/cncBuilder";
import {
  calculateMaterialCost,
  DEFAULT_MATERIAL_COST_CONFIG,
  type MaterialCostBreakdown,
  type MaterialCostConfig,
} from "./materialCost";
import {
  calculateOperationsCost,
  DEFAULT_OPERATIONS_COST_CONFIG,
  type OperationsCostBreakdown,
  type OperationsCostConfig,
} from "./operationsCost";
import {
  calculateCncCost,
  DEFAULT_CNC_COST_CONFIG,
  type CncCostBreakdown,
  type CncCostConfig,
} from "./cncCost";
import {
  calculateAssemblyCost,
  DEFAULT_ASSEMBLY_COST_CONFIG,
  type AssemblyCostBreakdown,
  type AssemblyCostConfig,
} from "./assemblyCost";
import {
  calculateLaborCost,
  DEFAULT_LABOR_COST_CONFIG,
  type LaborCostBreakdown,
  type LaborCostConfig,
} from "./laborCost";
import {
  calculateOverheadCost,
  DEFAULT_OVERHEAD_COST_CONFIG,
  type OverheadCostBreakdown,
  type OverheadCostConfig,
} from "./overheadCost";
import {
  calculateMarginAndPrice,
  DEFAULT_MARGIN_CONFIG,
  type MarginBreakdown,
  type MarginConfig,
} from "./marginCalculator";
import { buildPricingReport, type PricingReport } from "./pricingReport";

export type IndustrialPricingConfig = {
  material: MaterialCostConfig;
  operations: OperationsCostConfig;
  cnc: CncCostConfig;
  assembly: AssemblyCostConfig;
  labor: LaborCostConfig;
  overhead: OverheadCostConfig;
  margin: MarginConfig;
  currency: string;
};

export const DEFAULT_INDUSTRIAL_PRICING_CONFIG: IndustrialPricingConfig = {
  material: DEFAULT_MATERIAL_COST_CONFIG,
  operations: DEFAULT_OPERATIONS_COST_CONFIG,
  cnc: DEFAULT_CNC_COST_CONFIG,
  assembly: DEFAULT_ASSEMBLY_COST_CONFIG,
  labor: DEFAULT_LABOR_COST_CONFIG,
  overhead: DEFAULT_OVERHEAD_COST_CONFIG,
  margin: DEFAULT_MARGIN_CONFIG,
  currency: "EUR",
};

export type IndustrialPricing = {
  kind: "industrial-pricing";
  currency: string;
  materials: MaterialCostBreakdown;
  operations: OperationsCostBreakdown;
  cnc: CncCostBreakdown;
  assembly: AssemblyCostBreakdown;
  labor: LaborCostBreakdown;
  overhead: OverheadCostBreakdown;
  margin: MarginBreakdown;
  totals: {
    costIndustrial: number;
    priceFinal: number;
    pricePerDrawer: number;
    pricePerModule: number;
    costPerDrawer: number;
    costPerModule: number;
    drawerCount: number;
    moduleCount: number;
  };
  report: PricingReport;
};

export type PricingBuildOptions = {
  config?: Partial<{
    material: Partial<MaterialCostConfig>;
    operations: Partial<OperationsCostConfig>;
    cnc: Partial<CncCostConfig>;
    assembly: Partial<AssemblyCostConfig>;
    labor: Partial<LaborCostConfig>;
    overhead: Partial<OverheadCostConfig>;
    margin: Partial<MarginConfig>;
    currency: string;
  }>;
  moduleCount?: number;
  drawerCount?: number;
};

function mergeConfig(options?: PricingBuildOptions): IndustrialPricingConfig {
  const partial = options?.config ?? {};
  return {
    currency: partial.currency ?? DEFAULT_INDUSTRIAL_PRICING_CONFIG.currency,
    material: { ...DEFAULT_MATERIAL_COST_CONFIG, ...(partial.material ?? {}) },
    operations: { ...DEFAULT_OPERATIONS_COST_CONFIG, ...(partial.operations ?? {}) },
    cnc: { ...DEFAULT_CNC_COST_CONFIG, ...(partial.cnc ?? {}) },
    assembly: { ...DEFAULT_ASSEMBLY_COST_CONFIG, ...(partial.assembly ?? {}) },
    labor: { ...DEFAULT_LABOR_COST_CONFIG, ...(partial.labor ?? {}) },
    overhead: { ...DEFAULT_OVERHEAD_COST_CONFIG, ...(partial.overhead ?? {}) },
    margin: { ...DEFAULT_MARGIN_CONFIG, ...(partial.margin ?? {}) },
  };
}

function countCutOpsFromDxf(result: EuropeanDrawerResult): number {
  const entities = result.dxf?.document?.entities ?? [];
  return entities.filter((e) => e.type === "LINE" && e.layer === "CUT").length;
}

/**
 * Constrói o relatório completo de custo industrial.
 * Não altera geometry/furos/cutlist/DXF/CNC — apenas lê.
 */
export function buildIndustrialPricing(
  result: EuropeanDrawerResult,
  options?: PricingBuildOptions
): IndustrialPricing {
  const cfg = mergeConfig(options);
  const warnings: string[] = [];
  const errors: string[] = [];

  const industrialIntegrityOk =
    Boolean(result.geometry) &&
    Array.isArray(result.holes) &&
    Array.isArray(result.cutlist) &&
    result.geometry.externalWidthMm > 0;

  if (!industrialIntegrityOk) {
    errors.push("Resultado industrial incompleto para pricing.");
  }

  const drawerCount = Math.max(
    1,
    options?.drawerCount ??
      result.viewer?.drawers?.length ??
      result.config?.count ??
      1
  );
  const moduleCount = Math.max(1, options?.moduleCount ?? 1);

  const materials = calculateMaterialCost(result.cutlist, cfg.material);
  if (materials.pieces.length === 0) {
    warnings.push("Cutlist sem peças wood — custo de material = 0.");
  }

  let cutOps = 0;
  let drillOps = 0;
  try {
    const programs = buildEuropeanCncPrograms(result);
    for (const p of programs) {
      cutOps += p.cuts.length;
      drillOps += p.drills.length;
    }
  } catch {
    warnings.push("CNC programs indisponíveis — a usar DXF/holes como fallback.");
    cutOps = countCutOpsFromDxf(result);
    drillOps = result.holes.filter((h) => !(h.pieceRef || "").startsWith("module_")).length;
  }

  if (cutOps === 0 && result.dxf) {
    cutOps = countCutOpsFromDxf(result);
  }
  if (drillOps === 0) {
    drillOps = result.holes.length;
  }

  const woodPieceCount = result.cutlist.filter((i) => i.kind === "wood").length;
  const operations = calculateOperationsCost(
    {
      pieceCount: woodPieceCount || result.cutlist.length,
      holeCount: result.holes.length,
      cutOpCount: cutOps,
    },
    cfg.operations
  );

  const cnc = calculateCncCost({ cutOps, drillOps }, cfg.cnc);
  const assembly = calculateAssemblyCost({ drawerCount, moduleCount }, cfg.assembly);

  const labor = calculateLaborCost(
    {
      assemblyMinutes: assembly.assemblyMinutes,
      operationsMinutes: operations.estimatedMinutes,
    },
    cfg.labor
  );

  const directWithoutLaborDup = round2(
    materials.totalWoodCost + operations.totalCost + cnc.totalCost + assembly.hardwareCost
  );
  const overhead = calculateOverheadCost(directWithoutLaborDup, cfg.overhead);

  const costIndustrial = round2(directWithoutLaborDup + labor.totalCost + overhead.totalCost);

  const margin = calculateMarginAndPrice(
    { industrialCost: costIndustrial, drawerCount, moduleCount },
    cfg.margin
  );

  const report = buildPricingReport({
    warnings,
    errors,
    industrialIntegrityOk,
    costIndustrial,
    priceFinal: margin.priceFinal,
  });

  return {
    kind: "industrial-pricing",
    currency: cfg.currency,
    materials,
    operations,
    cnc,
    assembly,
    labor,
    overhead,
    margin,
    totals: {
      costIndustrial,
      priceFinal: margin.priceFinal,
      pricePerDrawer: margin.pricePerDrawer,
      pricePerModule: margin.pricePerModule,
      costPerDrawer: round2(costIndustrial / drawerCount),
      costPerModule: round2(costIndustrial / moduleCount),
      drawerCount,
      moduleCount,
    },
    report,
  };
}

/**
 * Estima pricing agregado para Kitchen Library (módulos × amostra Modelo B).
 */
export function buildKitchenLibraryPricing(
  drawerPricing: IndustrialPricing,
  moduleCount: number
): IndustrialPricing {
  const n = Math.max(1, moduleCount);
  const scale = (v: number) => round2(v * n);

  const costIndustrial = scale(drawerPricing.totals.costIndustrial);
  const drawerCount = drawerPricing.totals.drawerCount * n;

  const margin = calculateMarginAndPrice(
    { industrialCost: costIndustrial, drawerCount, moduleCount: n },
    { marginPercent: drawerPricing.margin.marginPercent }
  );

  return {
    ...drawerPricing,
    materials: {
      ...drawerPricing.materials,
      totalAreaM2: round4(drawerPricing.materials.totalAreaM2 * n),
      totalWoodCost: scale(drawerPricing.materials.totalWoodCost),
    },
    operations: {
      ...drawerPricing.operations,
      pieceCount: drawerPricing.operations.pieceCount * n,
      holeCount: drawerPricing.operations.holeCount * n,
      cutOpCount: drawerPricing.operations.cutOpCount * n,
      estimatedMinutes: scale(drawerPricing.operations.estimatedMinutes),
      totalCost: scale(drawerPricing.operations.totalCost),
    },
    cnc: {
      ...drawerPricing.cnc,
      cutOps: drawerPricing.cnc.cutOps * n,
      drillOps: drawerPricing.cnc.drillOps * n,
      totalCost: scale(drawerPricing.cnc.totalCost),
    },
    assembly: {
      ...drawerPricing.assembly,
      drawerCount,
      moduleCount: n,
      totalCost: scale(drawerPricing.assembly.totalCost),
    },
    labor: {
      ...drawerPricing.labor,
      totalCost: scale(drawerPricing.labor.totalCost),
    },
    overhead: {
      ...drawerPricing.overhead,
      totalCost: scale(drawerPricing.overhead.totalCost),
    },
    margin,
    totals: {
      costIndustrial,
      priceFinal: margin.priceFinal,
      pricePerDrawer: margin.pricePerDrawer,
      pricePerModule: margin.pricePerModule,
      costPerDrawer: round2(costIndustrial / Math.max(1, drawerCount)),
      costPerModule: round2(costIndustrial / n),
      drawerCount,
      moduleCount: n,
    },
    report: buildPricingReport({
      warnings: [
        ...drawerPricing.report.warnings,
        `Kitchen pricing escalado ×${n} módulos (estimativa).`,
      ],
      errors: drawerPricing.report.errors,
      industrialIntegrityOk: drawerPricing.report.industrialIntegrityOk,
      costIndustrial,
      priceFinal: margin.priceFinal,
    }),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
