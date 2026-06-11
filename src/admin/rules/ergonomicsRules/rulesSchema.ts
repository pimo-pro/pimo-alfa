import type { RulesFieldDef } from "../shared/types";
import type { ErgonomicsRules } from "./rulesDefaults";

export const ERGONOMICSRULES_FIELDS: RulesFieldDef[] = [
  { key: "baseCabinetHeightMm", label: "Base Cabinet Height (mm)", type: "number", section: "Ergonomia", min: 0, step: 1 },
  { key: "workTriangleMinMm", label: "Work Triangle Min (mm)", type: "number", section: "Ergonomia", min: 0, step: 1 },
  { key: "workTriangleMaxMm", label: "Work Triangle Max (mm)", type: "number", section: "Ergonomia", min: 0, step: 1 },
  { key: "doorClearanceMm", label: "Door Clearance (mm)", type: "number", section: "Ergonomia", min: 0, step: 1 },
  { key: "drawerClearanceMm", label: "Drawer Clearance (mm)", type: "number", section: "Ergonomia", min: 0, step: 1 },
  { key: "wallModuleGapMinMm", label: "Wall Module Gap Min (mm)", type: "number", section: "Ergonomia", min: 0, step: 1 },
];

export type { ErgonomicsRules };
