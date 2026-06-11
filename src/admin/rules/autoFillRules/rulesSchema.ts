import type { RulesFieldDef } from "../shared/types";
import type { AutoFillRules } from "./rulesDefaults";

export const AUTOFILLRULES_FIELDS: RulesFieldDef[] = [
  { key: "minModuleWidthMm", label: "Min Module Width (mm)", type: "number", section: "Auto-Wall-Fill", min: 0, step: 1 },
  { key: "maxModulesPerWall", label: "Max Modules Per Wall", type: "number", section: "Auto-Wall-Fill", min: 0, step: 1 },
  { key: "wallFillGapMm", label: "Wall Fill Gap (mm)", type: "number", section: "Auto-Wall-Fill", min: 0, step: 0.01 },
  { key: "roomFillMaxModules", label: "Room Fill Max Modules", type: "number", section: "Auto-Room-Fill", min: 0, step: 1 },
  { key: "equalGapsDefault", label: "Equal Gaps Default", type: "boolean", section: "Alinhamento" },
  { key: "alignTopDefault", label: "Align Top Default", type: "boolean", section: "Alinhamento" },
  { key: "alignFrontDefault", label: "Align Front Default", type: "boolean", section: "Alinhamento" },
];

export type { AutoFillRules };
