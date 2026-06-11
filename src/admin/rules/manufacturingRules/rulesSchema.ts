import type { RulesFieldDef } from "../shared/types";
import type { ManufacturingRules } from "./rulesDefaults";

export const MANUFACTURINGRULES_FIELDS: RulesFieldDef[] = [
  { key: "standardBaseHeightMm", label: "Standard Base Height (mm)", type: "number", section: "Alturas", min: 0, step: 1 },
  { key: "standardUpperHeightMm", label: "Standard Upper Height (mm)", type: "number", section: "Alturas", min: 0, step: 1 },
  { key: "heightToleranceMm", label: "Height Tolerance (mm)", type: "number", section: "Alturas", min: 0, step: 1 },
  { key: "depthMinMm", label: "Depth Min (mm)", type: "number", section: "Profundidades", min: 0, step: 1 },
  { key: "depthMaxMm", label: "Depth Max (mm)", type: "number", section: "Profundidades", min: 0, step: 1 },
  { key: "depthInconsistencyMm", label: "Depth Inconsistency (mm)", type: "number", section: "Profundidades", min: 0, step: 1 },
  { key: "rodapeGapMaxMm", label: "Rodape Gap Max (mm)", type: "number", section: "Folgas", min: 0, step: 0.01 },
  { key: "doorClearanceMinMm", label: "Door Clearance Min (mm)", type: "number", section: "Folgas", min: 0, step: 1 },
  { key: "drawerClearanceMinMm", label: "Drawer Clearance Min (mm)", type: "number", section: "Folgas", min: 0, step: 1 },
  { key: "openingMarginMm", label: "Opening Margin (mm)", type: "number", section: "Folgas", min: 0, step: 1 },
  { key: "moduleMinGapMm", label: "Module Min Gap (mm)", type: "number", section: "Folgas", min: 0, step: 1 },
  { key: "remateOffsetWarnMm", label: "Remate Offset Warn (mm)", type: "number", section: "Folgas", min: 0, step: 1 },
];

export type { ManufacturingRules };
