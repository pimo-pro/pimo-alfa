export type ManufacturingRules = {
  standardBaseHeightMm: number;
  standardUpperHeightMm: number;
  heightToleranceMm: number;
  depthMinMm: number;
  depthMaxMm: number;
  depthInconsistencyMm: number;
  rodapeGapMaxMm: number;
  doorClearanceMinMm: number;
  drawerClearanceMinMm: number;
  openingMarginMm: number;
  moduleMinGapMm: number;
  remateOffsetWarnMm: number;
};

export const MANUFACTURING_RULES_DEFAULTS: ManufacturingRules = {
  "standardBaseHeightMm": 720,
  "standardUpperHeightMm": 720,
  "heightToleranceMm": 15,
  "depthMinMm": 500,
  "depthMaxMm": 650,
  "depthInconsistencyMm": 30,
  "rodapeGapMaxMm": 1,
  "doorClearanceMinMm": 3,
  "drawerClearanceMinMm": 2,
  "openingMarginMm": 120,
  "moduleMinGapMm": 2,
  "remateOffsetWarnMm": 2
};
