import type { RulesFieldDef } from "../shared/types";
import type { ShelfRules } from "./rulesDefaults";

export const SHELFRULES_FIELDS: RulesFieldDef[] = [
  { key: "defaultShelfCount", label: "Default Shelf Count", type: "number", section: "Prateleiras", min: 0, step: 1 },
  { key: "topMarginMm", label: "Top Margin (mm)", type: "number", section: "Prateleiras", min: 0, step: 1 },
  { key: "bottomMarginMm", label: "Bottom Margin (mm)", type: "number", section: "Prateleiras", min: 0, step: 1 },
  { key: "minShelfGapMm", label: "Min Shelf Gap (mm)", type: "number", section: "Prateleiras", min: 0, step: 1 },
  { key: "maxShelvesPerBox", label: "Max Shelves Per Box", type: "number", section: "Prateleiras", min: 0, step: 1 },
];

export type { ShelfRules };
