export type PredictiveRules = {
  maxDesignPreviews: number;
  overlayGuideOpacity: number;
  autoRefineOnAccept: boolean;
  rejectClearsOverlay: boolean;
};

export const PREDICTIVE_RULES_DEFAULTS: PredictiveRules = {
  "maxDesignPreviews": 8,
  "overlayGuideOpacity": 0.85,
  "autoRefineOnAccept": true,
  "rejectClearsOverlay": true
};
