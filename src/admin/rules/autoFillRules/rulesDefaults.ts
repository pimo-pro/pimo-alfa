export type AutoFillRules = {
  minModuleWidthMm: number;
  maxModulesPerWall: number;
  equalGapsDefault: boolean;
  alignTopDefault: boolean;
  alignFrontDefault: boolean;
  roomFillMaxModules: number;
  wallFillGapMm: number;
};

export const AUTO_FILL_RULES_DEFAULTS: AutoFillRules = {
  "minModuleWidthMm": 300,
  "maxModulesPerWall": 12,
  "equalGapsDefault": true,
  "alignTopDefault": true,
  "alignFrontDefault": true,
  "roomFillMaxModules": 20,
  "wallFillGapMm": 0
};
