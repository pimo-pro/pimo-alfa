import type { AutoLayoutPlan } from "../autoLayout/autoLayoutTypes";
import type { IntelligentDesignerEngine } from "./intelligentDesignerEngine";
import type { CostScanResult, CostSuggestion, CostSuggestionKind } from "./costTypes";
import { getCostWeights } from "./rulesRuntime";
import { CostEstimatorEngine } from "./costEstimatorEngine";

export type CostVariationEngineDeps = {
  getDesigner: () => IntelligentDesignerEngine;
  getScan: () => CostScanResult;
  seedBoxId: () => string;
};

/**
 * Sugestões de alternativas económicas, premium e equilibradas.
 */
export class CostVariationEngine {
  private readonly deps: CostVariationEngineDeps;
  private readonly estimator = new CostEstimatorEngine();
  private lastSuggestion: CostSuggestion | null = null;

  constructor(deps: CostVariationEngineDeps) {
    this.deps = deps;
  }

  getLastSuggestion(): CostSuggestion | null {
    return this.lastSuggestion;
  }

  suggestCheaperAlternative(): CostSuggestion | null {
    return this.buildSuggestion("cheaper");
  }

  suggestPremiumAlternative(): CostSuggestion | null {
    return this.buildSuggestion("premium");
  }

  suggestBalancedAlternative(): CostSuggestion | null {
    return this.buildSuggestion("balanced");
  }

  suggestReduceCostPercent(percent: number): CostSuggestion | null {
    const base = this.suggestCheaperAlternative();
    if (!base) return null;
    const target = Math.max(5, Math.min(40, percent));
    return {
      ...base,
      label: `Reduzir custo ~${target}%`,
      description: `Versão mais económica com meta de redução de ~${target}% no custo relativo.`,
      savingsPercent: target,
    };
  }

  private buildSuggestion(kind: CostSuggestionKind): CostSuggestion | null {
    const designer = this.deps.getDesigner();
    const scan = this.deps.getScan();
    const seedBoxId = this.deps.seedBoxId();
    if (!seedBoxId) return null;

    let plan: AutoLayoutPlan | null = null;
    let label = "";
    let description = "";
    let multiplier = 1;

    if (kind === "cheaper") {
      if (!designer.getDesigns().length) designer.buildDesigns(seedBoxId);
      const designB = designer.getDesignById("B");
      if (designB) {
        plan = designB.plan;
        label = "Versão mais económica — Design B";
        description = "Menos módulos e mais espaço livre — menor custo relativo.";
        multiplier = getCostWeights().designMultipliers.B;
      } else {
        const style = designer.buildStyleDesign("minimalist", seedBoxId);
        if (style) {
          plan = style.plan;
          label = "Versão mais económica — Minimalista";
          description = style.description;
          multiplier = getCostWeights().styleMultipliers.minimalist;
        }
      }
    } else if (kind === "premium") {
      if (!designer.getDesigns().length) designer.buildDesigns(seedBoxId);
      const designC = designer.getDesignById("C");
      const luxury = designer.buildStyleDesign("luxury", seedBoxId);
      if (luxury && (!designC || getCostWeights().styleMultipliers.luxury >= getCostWeights().designMultipliers.C)) {
        plan = luxury.plan;
        label = "Versão premium — Luxo";
        description = luxury.description;
        multiplier = getCostWeights().styleMultipliers.luxury;
      } else if (designC) {
        plan = designC.plan;
        label = "Versão premium — Design C";
        description = "Máximo armazenamento — custo relativo superior.";
        multiplier = getCostWeights().designMultipliers.C;
      }
    } else {
      if (!designer.getDesigns().length) designer.buildDesigns(seedBoxId);
      const designA = designer.getDesignById("A");
      const modern = designer.buildStyleDesign("modern", seedBoxId);
      if (designA) {
        plan = designA.plan;
        label = "Versão equilibrada — Design A";
        description = "Equilíbrio entre funcionalidade e custo.";
        multiplier = getCostWeights().designMultipliers.A;
      } else if (modern) {
        plan = modern.plan;
        label = "Versão equilibrada — Moderno";
        description = modern.description;
        multiplier = getCostWeights().styleMultipliers.modern;
      }
    }

    if (!plan) return null;

    const estimatedCost = this.estimator.estimatePlanCost(plan, scan, multiplier);
    const economyScore = this.estimator.computeEconomyScore(estimatedCost, scan.moduleBreakdown.length);
    const savingsPercent =
      kind === "cheaper" && scan.totalRelativeCost > 0
        ? Math.round(((scan.totalRelativeCost - estimatedCost) / scan.totalRelativeCost) * 100)
        : undefined;
    const premiumPercent =
      kind === "premium" && scan.totalRelativeCost > 0
        ? Math.round(((estimatedCost - scan.totalRelativeCost) / scan.totalRelativeCost) * 100)
        : undefined;

    const suggestion: CostSuggestion = {
      kind,
      label,
      description,
      plan,
      estimatedCost,
      economyScore,
      savingsPercent,
      premiumPercent,
    };
    this.lastSuggestion = suggestion;
    return suggestion;
  }
}
