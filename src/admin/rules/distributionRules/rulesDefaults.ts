export type DistributionRules = {
  minGapMm: number;
  useHistorySpacing: boolean;
  alignTop: boolean;
  alignFront: boolean;
  alignDepth: boolean;
  distributeEvenly: boolean;
};

export const DISTRIBUTION_RULES_DEFAULTS: DistributionRules = {
  "minGapMm": 2,
  "useHistorySpacing": true,
  "alignTop": true,
  "alignFront": true,
  "alignDepth": true,
  "distributeEvenly": true
};
