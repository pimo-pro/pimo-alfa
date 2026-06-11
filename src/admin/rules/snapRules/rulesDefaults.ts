export type SnapRules = {
  captureRadiusMm: number;
  magnetStrength: number;
  gridSizeMm: number;
  flushToleranceMm: number;
  snapPriorityBox: number;
  snapPriorityRemate: number;
  snapPriorityRodape: number;
  autoBalanceEnabled: boolean;
  predictiveSnapEnabled: boolean;
};

export const SNAP_RULES_DEFAULTS: SnapRules = {
  "captureRadiusMm": 45,
  "magnetStrength": 0.85,
  "gridSizeMm": 50,
  "flushToleranceMm": 2,
  "snapPriorityBox": 100,
  "snapPriorityRemate": 80,
  "snapPriorityRodape": 70,
  "autoBalanceEnabled": true,
  "predictiveSnapEnabled": true
};
