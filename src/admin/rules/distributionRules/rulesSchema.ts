import type { RulesFieldDef } from "../shared/types";
import type { DistributionRules } from "./rulesDefaults";

export const DISTRIBUTIONRULES_FIELDS: RulesFieldDef[] = [
  { key: "minGapMm", label: "Min Gap (mm)", type: "number", section: "Distribuicao", min: 0, step: 1 },
  { key: "useHistorySpacing", label: "Use History Spacing", type: "boolean", section: "Distribuicao" },
  { key: "alignTop", label: "Align Top", type: "boolean", section: "Distribuicao" },
  { key: "alignFront", label: "Align Front", type: "boolean", section: "Distribuicao" },
  { key: "alignDepth", label: "Align Depth", type: "boolean", section: "Distribuicao" },
  { key: "distributeEvenly", label: "Distribute Evenly", type: "boolean", section: "Distribuicao" },
];

export type { DistributionRules };
