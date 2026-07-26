/**
 * plannerPlacement.ts — Regras de posicionamento (somente leitura sobre Kitchen Library).
 */

import type { KitchenModuleKind, KitchenRodapeModel, KitchenRemateModel } from "../kitchen/types";

export type PlannerPlacementRules = {
  countertopHeightMm: number;
  upperBottomHeightMm: number;
  baseFloorOffsetMm: number;
  frontGapMm: number;
  wallRecessMm: number;
  rodapeHeightMm: number;
  rodapeRecessMm: number;
};

export const DEFAULT_PLACEMENT_RULES: PlannerPlacementRules = {
  countertopHeightMm: 900,
  upperBottomHeightMm: 1400,
  baseFloorOffsetMm: 0,
  frontGapMm: 2,
  wallRecessMm: 0,
  rodapeHeightMm: 100,
  rodapeRecessMm: 0,
};

export function buildPlacementRules(input?: {
  rodape?: KitchenRodapeModel[];
  remates?: KitchenRemateModel[];
}): PlannerPlacementRules {
  const rodape = input?.rodape?.[0];
  return {
    ...DEFAULT_PLACEMENT_RULES,
    rodapeHeightMm: rodape?.heightMm ?? DEFAULT_PLACEMENT_RULES.rodapeHeightMm,
    rodapeRecessMm: rodape?.recessMm ?? DEFAULT_PLACEMENT_RULES.rodapeRecessMm,
  };
}

/** Origem Y sugerida no alçado (elevação) por tipo de módulo. */
export function suggestedElevationYMm(
  kind: KitchenModuleKind,
  rules: PlannerPlacementRules = DEFAULT_PLACEMENT_RULES
): number {
  if (kind === "upper") return rules.upperBottomHeightMm;
  if (kind === "tall") return rules.baseFloorOffsetMm;
  // base + corner: assentam sobre rodapé (visual)
  return rules.baseFloorOffsetMm + rules.rodapeHeightMm;
}

/** Alinhamento de frentes/portas — folga documental. */
export function frontAlignmentOffsetMm(
  rules: PlannerPlacementRules = DEFAULT_PLACEMENT_RULES
): number {
  return rules.frontGapMm;
}
