import type { RulesFieldDef } from "../shared/types";
import type { PredictiveRules } from "./rulesDefaults";

export const PREDICTIVERULES_FIELDS: RulesFieldDef[] = [
  { key: "maxDesignPreviews", label: "Max Design Previews", type: "number", section: "Layout Preditivo", min: 0, step: 1 },
  { key: "overlayGuideOpacity", label: "Overlay Guide Opacity", type: "number", section: "Layout Preditivo", min: 0, step: 0.01 },
  { key: "autoRefineOnAccept", label: "Auto Refine On Accept", type: "boolean", section: "Layout Preditivo" },
  { key: "rejectClearsOverlay", label: "Reject Clears Overlay", type: "boolean", section: "Layout Preditivo" },
];

export type { PredictiveRules };
