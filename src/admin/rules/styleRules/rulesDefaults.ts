export type StyleRules = {
  styleMatchMinScore: number;
  flushFrontDefault: number;
  continuityDefault: boolean;
  learnStyleEnabled: boolean;
  maxStyleModules: number;
};

export const STYLE_RULES_DEFAULTS: StyleRules = {
  "styleMatchMinScore": 65,
  "flushFrontDefault": 0.8,
  "continuityDefault": true,
  "learnStyleEnabled": true,
  "maxStyleModules": 10
};
