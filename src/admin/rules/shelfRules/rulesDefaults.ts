export type ShelfRules = {
  defaultShelfCount: number;
  topMarginMm: number;
  bottomMarginMm: number;
  minShelfGapMm: number;
  maxShelvesPerBox: number;
};

export const SHELF_RULES_DEFAULTS: ShelfRules = {
  "defaultShelfCount": 3,
  "topMarginMm": 40,
  "bottomMarginMm": 40,
  "minShelfGapMm": 80,
  "maxShelvesPerBox": 8
};
