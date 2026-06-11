import type { RulesFieldDef } from "../shared/types";
import type { LayoutRules } from "./rulesDefaults";

export const LAYOUTRULES_FIELDS: RulesFieldDef[] = [
  { key: "primaryWallPriority", label: "Primary Wall Priority", type: "number", section: "Layout Profiles", min: 0, step: 0.01 },
  { key: "secondaryWallPriority", label: "Secondary Wall Priority", type: "number", section: "Layout Profiles", min: 0, step: 0.01 },
  { key: "maxModulesPerRow", label: "Max Modules Per Row", type: "number", section: "Layout Profiles", min: 0, step: 1 },
  { key: "roomInsetMm", label: "Room Inset (mm)", type: "number", section: "Layout Profiles", min: 0, step: 0.01 },
  { key: "preferSymmetry", label: "Prefer Symmetry", type: "boolean", section: "Layout Profiles" },
];

export type { LayoutRules };
