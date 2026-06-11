import type { RulesFieldDef } from "../shared/types";
import type { DesignerRules } from "./rulesDefaults";

export const DESIGNERRULES_FIELDS: RulesFieldDef[] = [
  { key: "designAModuleBias", label: "Design A Module Bias", type: "number", section: "Design A/B/C", min: 0, step: 0.01 },
  { key: "designBSpaceBias", label: "Design B Space Bias", type: "number", section: "Design A/B/C", min: 0, step: 0.01 },
  { key: "designCStorageBias", label: "Design C Storage Bias", type: "number", section: "Design A/B/C", min: 0, step: 0.01 },
  { key: "minErgonomicsScore", label: "Min Ergonomics Score", type: "number", section: "Aprendizagem", min: 0, step: 1 },
  { key: "variationCount", label: "Variation Count", type: "number", section: "Aprendizagem", min: 0, step: 1 },
  { key: "learnPreferencesWeight", label: "Learn Preferences Weight", type: "number", section: "Aprendizagem", min: 0, step: 0.01 },
];

export type { DesignerRules };
