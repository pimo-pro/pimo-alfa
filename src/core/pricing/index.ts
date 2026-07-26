/**
 * src/core/pricing — Industrial Pricing Engine (Fase 18).
 * Camada de custo por cima do Modelo B / Kitchen Library.
 * Não altera geometry, furos, cutlist, DXF, CNC, Modelo A nem src/industrial/**.
 */

export {
  calculateMaterialCost,
  DEFAULT_MATERIAL_COST_CONFIG,
  type MaterialCostBreakdown,
  type MaterialCostConfig,
  type MaterialPieceCost,
} from "./materialCost";

export {
  calculateOperationsCost,
  DEFAULT_OPERATIONS_COST_CONFIG,
  type OperationsCostBreakdown,
  type OperationsCostConfig,
} from "./operationsCost";

export {
  calculateCncCost,
  DEFAULT_CNC_COST_CONFIG,
  type CncCostBreakdown,
  type CncCostConfig,
} from "./cncCost";

export {
  calculateAssemblyCost,
  DEFAULT_ASSEMBLY_COST_CONFIG,
  type AssemblyCostBreakdown,
  type AssemblyCostConfig,
} from "./assemblyCost";

export {
  calculateLaborCost,
  DEFAULT_LABOR_COST_CONFIG,
  type LaborCostBreakdown,
  type LaborCostConfig,
} from "./laborCost";

export {
  calculateOverheadCost,
  DEFAULT_OVERHEAD_COST_CONFIG,
  type OverheadCostBreakdown,
  type OverheadCostConfig,
} from "./overheadCost";

export {
  calculateMarginAndPrice,
  DEFAULT_MARGIN_CONFIG,
  type MarginBreakdown,
  type MarginConfig,
} from "./marginCalculator";

export {
  buildIndustrialPricing,
  buildKitchenLibraryPricing,
  DEFAULT_INDUSTRIAL_PRICING_CONFIG,
  type IndustrialPricing,
  type IndustrialPricingConfig,
  type PricingBuildOptions,
} from "./pricingBuilder";

export {
  buildPricingReport,
  formatPricingReportText,
  type PricingReport,
  type PricingStatus,
} from "./pricingReport";
