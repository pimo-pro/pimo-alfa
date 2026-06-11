export type VariationRules = {
  moreFreeSpaceSpread: number;
  moreStorageCloneFactor: number;
  moreSymmetryMirror: number;
  moreDepthNudgeMm: number;
  variationPreviewEnabled: boolean;
};

export const VARIATION_RULES_DEFAULTS: VariationRules = {
  "moreFreeSpaceSpread": 1.15,
  "moreStorageCloneFactor": 1,
  "moreSymmetryMirror": 1,
  "moreDepthNudgeMm": 80,
  "variationPreviewEnabled": true
};
