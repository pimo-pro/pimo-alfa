export type ErgonomicsRules = {
  baseCabinetHeightMm: number;
  workTriangleMinMm: number;
  workTriangleMaxMm: number;
  doorClearanceMm: number;
  drawerClearanceMm: number;
  wallModuleGapMinMm: number;
};

export const ERGONOMICS_RULES_DEFAULTS: ErgonomicsRules = {
  "baseCabinetHeightMm": 720,
  "workTriangleMinMm": 1200,
  "workTriangleMaxMm": 2600,
  "doorClearanceMm": 600,
  "drawerClearanceMm": 450,
  "wallModuleGapMinMm": 50
};
