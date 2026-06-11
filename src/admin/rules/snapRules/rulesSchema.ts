import type { RulesFieldDef } from "../shared/types";
import type { SnapRules } from "./rulesDefaults";

export const SNAPRULES_FIELDS: RulesFieldDef[] = [
  { key: "captureRadiusMm", label: "Capture Radius (mm)", type: "number", section: "Snap unificado", min: 0, step: 1 },
  { key: "magnetStrength", label: "Magnet Strength", type: "number", section: "Snap unificado", min: 0, step: 0.01 },
  { key: "gridSizeMm", label: "Grid Size (mm)", type: "number", section: "Snap unificado", min: 0, step: 1 },
  { key: "flushToleranceMm", label: "Flush Tolerance (mm)", type: "number", section: "Snap unificado", min: 0, step: 1 },
  { key: "snapPriorityBox", label: "Snap Priority Box", type: "number", section: "Prioridades", min: 0, step: 1 },
  { key: "snapPriorityRemate", label: "Snap Priority Remate", type: "number", section: "Prioridades", min: 0, step: 1 },
  { key: "snapPriorityRodape", label: "Snap Priority Rodape", type: "number", section: "Prioridades", min: 0, step: 1 },
  { key: "autoBalanceEnabled", label: "Auto Balance ativo", type: "boolean", section: "Comportamento" },
  { key: "predictiveSnapEnabled", label: "Predictive Snap ativo", type: "boolean", section: "Comportamento" },
];

export type { SnapRules };
