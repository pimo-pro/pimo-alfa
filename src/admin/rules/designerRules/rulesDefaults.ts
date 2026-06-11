export type DesignerRules = {
  designAModuleBias: number;
  designBSpaceBias: number;
  designCStorageBias: number;
  minErgonomicsScore: number;
  variationCount: number;
  learnPreferencesWeight: number;
};

export const DESIGNER_RULES_DEFAULTS: DesignerRules = {
  "designAModuleBias": 1,
  "designBSpaceBias": 0.75,
  "designCStorageBias": 1.25,
  "minErgonomicsScore": 60,
  "variationCount": 4,
  "learnPreferencesWeight": 0.5
};
