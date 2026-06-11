import type { AutoLayoutPlan } from "../autoLayout/autoLayoutTypes";
import type { AutoLayoutOpeningMm, AutoLayoutRoomBoundsMm } from "../autoLayout/autoLayoutTypes";
import type { RematePiece } from "../../../core/remate/rematePieceTypes";
import type { ProjectRodape } from "../../../core/rodape/rodapeTypes";
import type { WorkspaceBox } from "../../../core/types";
import type { DesignVariantId, EnvironmentStyleId, VariationKind } from "./intelligentDesignerTypes";

export type CostCategory =
  | "volume"
  | "complexity"
  | "remates"
  | "rodapes"
  | "symmetry"
  | "continuity";

export type CostModuleBreakdown = {
  boxId: string;
  label: string;
  relativeCost: number;
  volumeShare: number;
  complexityShare: number;
  remateShare: number;
  rodapeShare: number;
};

export type CostWallBreakdown = {
  wallId: number;
  wallLabel: string;
  relativeCost: number;
  moduleCount: number;
};

export type CostCategoryBreakdown = {
  category: CostCategory;
  relativeCost: number;
  percent: number;
};

export type CostStyleEstimate = {
  styleId: EnvironmentStyleId;
  label: string;
  relativeCost: number;
  economyScore: number;
};

export type CostDesignEstimate = {
  designId: DesignVariantId;
  label: string;
  relativeCost: number;
  economyScore: number;
};

export type CostVariationEstimate = {
  kind: VariationKind;
  label: string;
  relativeCost: number;
  economyScore: number;
};

export type CostScanResult = {
  totalRelativeCost: number;
  economyScore: number;
  moduleBreakdown: CostModuleBreakdown[];
  wallBreakdown: CostWallBreakdown[];
  categoryBreakdown: CostCategoryBreakdown[];
  recommendations: string[];
  scannedAt: number;
};

export type CostScanContext = {
  boxes: WorkspaceBox[];
  remates: RematePiece[];
  rodapes: ProjectRodape[];
  bounds: AutoLayoutRoomBoundsMm | null;
  openings: AutoLayoutOpeningMm[];
  wallOffsetMm?: number;
};

export type CostChangeInput = {
  depthDeltaMm?: number;
  heightDeltaMm?: number;
  moduleCountDelta?: number;
  remateCountDelta?: number;
  rodapeCountDelta?: number;
};

export type CostImpactEstimate = {
  currentCost: number;
  projectedCost: number;
  deltaCost: number;
  deltaPercent: number;
  economyScoreDelta: number;
  summary: string;
};

export type CostDesignComparison = {
  current: CostDesignEstimate | null;
  designs: CostDesignEstimate[];
  cheapestId: DesignVariantId;
  premiumId: DesignVariantId;
  summary: string;
};

export type CostStyleComparison = {
  styles: CostStyleEstimate[];
  cheapestId: EnvironmentStyleId;
  premiumId: EnvironmentStyleId;
  summary: string;
};

export type CostUiSummary = {
  totalRelativeCost: number;
  economyScore: number;
  summary: string;
  moduleBreakdown: CostModuleBreakdown[];
  wallBreakdown: CostWallBreakdown[];
  designComparison: CostDesignComparison | null;
  styleComparison: CostStyleComparison | null;
  recommendations: string[];
  scannedAt: number;
};

export type CostFullReport = CostUiSummary & {
  textReport: string;
  categoryBreakdown: CostCategoryBreakdown[];
};

export type CostSuggestionKind = "cheaper" | "premium" | "balanced";

export type CostSuggestion = {
  kind: CostSuggestionKind;
  label: string;
  description: string;
  plan: AutoLayoutPlan;
  estimatedCost: number;
  economyScore: number;
  savingsPercent?: number;
  premiumPercent?: number;
};

export const COST_WEIGHTS = {
  volumePerM3: 120,
  doorUnit: 14,
  drawerUnit: 11,
  shelfUnit: 5,
  remateUnit: 22,
  rodapeUnit: 16,
  symmetryBonus: -8,
  continuityBonus: -6,
  styleMultipliers: {
    modern: 1,
    nordic: 0.92,
    industrial: 1.08,
    minimalist: 0.85,
    classic: 1.05,
    scandinavian: 0.9,
    japandi: 0.95,
    luxury: 1.22,
  } as Record<EnvironmentStyleId, number>,
  designMultipliers: { A: 1, B: 0.82, C: 1.15 } as Record<DesignVariantId, number>,
  variationMultipliers: {
    moreFreeSpace: 0.78,
    moreStorage: 1.18,
    moreSymmetry: 1.02,
    moreDepth: 1.12,
  } as Record<VariationKind, number>,
} as const;
