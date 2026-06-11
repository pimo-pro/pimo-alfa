import type { RulesFieldDef } from "../shared/types";
import type { RoomRules } from "./rulesDefaults";

export const ROOMRULES_FIELDS: RulesFieldDef[] = [
  { key: "wallOffsetMm", label: "Wall Offset (mm)", type: "number", section: "Room Snap", min: 0, step: 1 },
  { key: "openingSnapMarginMm", label: "Opening Snap Margin (mm)", type: "number", section: "Room Snap", min: 0, step: 1 },
  { key: "cornerSnapEnabled", label: "Corner Snap ativo", type: "boolean", section: "Room Snap" },
  { key: "stackSnapEnabled", label: "Stack Snap ativo", type: "boolean", section: "Room Snap" },
  { key: "depthAlignToleranceMm", label: "Depth Align Tolerance (mm)", type: "number", section: "Tolerancias", min: 0, step: 1 },
  { key: "heightAlignToleranceMm", label: "Height Align Tolerance (mm)", type: "number", section: "Tolerancias", min: 0, step: 1 },
];

export type { RoomRules };
