export type ScoringRules = {
  ergonomicsWeight: number;
  costWeight: number;
  manufacturingWeight: number;
  productionReadyMinScore: number;
  economyMinScore: number;
  styleMatchWeight: number;
};

export const SCORING_RULES_DEFAULTS: ScoringRules = {
  "ergonomicsWeight": 0.33,
  "costWeight": 0.33,
  "manufacturingWeight": 0.34,
  "productionReadyMinScore": 85,
  "economyMinScore": 75,
  "styleMatchWeight": 0.2
};
