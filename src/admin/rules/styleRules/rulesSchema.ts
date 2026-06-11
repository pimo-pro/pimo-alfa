import type { RulesFieldDef } from "../shared/types";
import type { StyleRules } from "./rulesDefaults";

export const STYLERULES_FIELDS: RulesFieldDef[] = [
  { key: "styleMatchMinScore", label: "Style Match Min Score", type: "number", section: "Estilos", min: 0, step: 1 },
  { key: "flushFrontDefault", label: "Flush Front Default", type: "number", section: "Estilos", min: 0, step: 0.01 },
  { key: "continuityDefault", label: "Continuity Default", type: "boolean", section: "Estilos" },
  { key: "learnStyleEnabled", label: "Learn Style ativo", type: "boolean", section: "Estilos" },
  { key: "maxStyleModules", label: "Max Style Modules", type: "number", section: "Estilos", min: 0, step: 1 },
];

export type { StyleRules };
