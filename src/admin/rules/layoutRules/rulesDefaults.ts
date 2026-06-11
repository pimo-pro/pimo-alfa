export type LayoutRules = {
  primaryWallPriority: number;
  secondaryWallPriority: number;
  maxModulesPerRow: number;
  roomInsetMm: number;
  preferSymmetry: boolean;
};

export const LAYOUT_RULES_DEFAULTS: LayoutRules = {
  "primaryWallPriority": 1,
  "secondaryWallPriority": 0.7,
  "maxModulesPerRow": 8,
  "roomInsetMm": 0,
  "preferSymmetry": true
};
