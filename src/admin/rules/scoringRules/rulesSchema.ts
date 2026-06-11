import type { RulesFieldDef } from "../shared/types";
import type { ScoringRules } from "./rulesDefaults";

export const SCORINGRULES_FIELDS: RulesFieldDef[] = [
  { key: "ergonomicsWeight", label: "Ergonomics Weight", type: "number", section: "Pontuacao", min: 0, step: 0.01 },
  { key: "costWeight", label: "Cost Weight", type: "number", section: "Pontuacao", min: 0, step: 0.01 },
  { key: "manufacturingWeight", label: "Manufacturing Weight", type: "number", section: "Pontuacao", min: 0, step: 0.01 },
  { key: "productionReadyMinScore", label: "Production Ready Min Score", type: "number", section: "Pontuacao", min: 0, step: 1 },
  { key: "economyMinScore", label: "Economy Min Score", type: "number", section: "Pontuacao", min: 0, step: 1 },
  { key: "styleMatchWeight", label: "Style Match Weight", type: "number", section: "Pontuacao", min: 0, step: 0.01 },
];

export type { ScoringRules };
