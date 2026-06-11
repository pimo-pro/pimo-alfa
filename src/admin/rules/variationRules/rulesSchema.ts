import type { RulesFieldDef } from "../shared/types";
import type { VariationRules } from "./rulesDefaults";

export const VARIATIONRULES_FIELDS: RulesFieldDef[] = [
  { key: "moreFreeSpaceSpread", label: "More Free Space Spread", type: "number", section: "Variacoes", min: 0, step: 0.01 },
  { key: "moreStorageCloneFactor", label: "More Storage Clone Factor", type: "number", section: "Variacoes", min: 0, step: 0.01 },
  { key: "moreSymmetryMirror", label: "More Symmetry Mirror", type: "number", section: "Variacoes", min: 0, step: 0.01 },
  { key: "moreDepthNudgeMm", label: "More Depth Nudge (mm)", type: "number", section: "Variacoes", min: 0, step: 1 },
  { key: "variationPreviewEnabled", label: "Variation Preview ativo", type: "boolean", section: "Variacoes" },
];

export type { VariationRules };
