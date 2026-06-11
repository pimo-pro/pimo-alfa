import { rulesStore } from "../../../admin/rules/rulesStore";
import { COST_WEIGHTS } from "./costTypes";
import { MANUFACTURING_THRESHOLDS } from "./manufacturingTypes";
import { ERGONOMICS } from "./intelligentDesignerTypes";
import type { DesignVariantId, EnvironmentStyleId, VariationKind } from "./intelligentDesignerTypes";

/** Ponte somente leitura: motores leem regras admin com fallback aos defaults em código. */

export function getCostRules() {
  const r = rulesStore.costRules.get();
  return {
    ...r,
    weights: {
      volumePerM3: r.volumePerM3,
      doorUnit: r.doorUnit,
      drawerUnit: r.drawerUnit,
      shelfUnit: r.shelfUnit,
      remateUnit: r.remateUnit,
      rodapeUnit: r.rodapeUnit,
      symmetryBonus: r.symmetryBonus,
      continuityBonus: r.continuityBonus,
      styleMultipliers: {
        modern: r.multModern,
        nordic: r.multNordic,
        industrial: r.multIndustrial,
        minimalist: r.multMinimalist,
        classic: r.multClassic,
        scandinavian: r.multScandinavian,
        japandi: r.multJapandi,
        luxury: r.multLuxury,
      } as Record<EnvironmentStyleId, number>,
      designMultipliers: {
        A: r.multDesignA,
        B: r.multDesignB,
        C: r.multDesignC,
      } as Record<DesignVariantId, number>,
      variationMultipliers: {
        moreFreeSpace: r.multMoreFreeSpace,
        moreStorage: r.multMoreStorage,
        moreSymmetry: r.multMoreSymmetry,
        moreDepth: r.multMoreDepth,
      } as Record<VariationKind, number>,
    },
  };
}

export function getCostWeights() {
  return getCostRules().weights;
}

export function getCostHolePricing() {
  const r = getCostRules();
  return {
    extraCostPerHole: r.extraCostPerHole,
    holeCountMultiplier: r.holeCountMultiplier,
    costPerHole: r.costPerHole,
    byType: {
      dobradica: r.priceHoleDobradica,
      corredica: r.priceHoleCorredica,
      puxador: r.priceHolePuxador,
      cavilha: r.priceHoleCavilha,
      parafuso: r.priceHoleParafuso,
      minifix: r.priceHoleMinifix,
      prateleira: r.priceHolePrateleira,
    },
  };
}

export function getCostModulePiecePricing() {
  const r = getCostRules();
  return {
    costPerModulePiece: r.costPerModulePiece,
    modulePieceMultiplier: r.modulePieceMultiplier,
    costPerPiece: r.costPerPiece,
  };
}

export function getManufacturingRules() {
  const r = rulesStore.manufacturingRules.get();
  return { ...MANUFACTURING_THRESHOLDS, ...r };
}

export function getErgonomicsRules() {
  const r = rulesStore.ergonomicsRules.get();
  return { ...ERGONOMICS, ...r };
}

export function getSnapRules() {
  return rulesStore.snapRules.get();
}

export function getRoomRules() {
  return rulesStore.roomRules.get();
}

export function getAutoFillRules() {
  return rulesStore.autoFillRules.get();
}

export function getDesignerRules() {
  return rulesStore.designerRules.get();
}

export function getStyleRules() {
  return rulesStore.styleRules.get();
}

export function getConversationRules() {
  return rulesStore.conversationRules.get();
}

export function getVariationRules() {
  return rulesStore.variationRules.get();
}

export function getPredictiveRules() {
  return rulesStore.predictiveRules.get();
}

export function getDistributionRules() {
  return rulesStore.distributionRules.get();
}

export function getShelfRules() {
  return rulesStore.shelfRules.get();
}

export function getLayoutRules() {
  return rulesStore.layoutRules.get();
}

export function getScoringRules() {
  return rulesStore.scoringRules.get();
}

/** Compat: expõe defaults legados se admin nunca foi aberto. */
export const LEGACY_COST_WEIGHTS = COST_WEIGHTS;
