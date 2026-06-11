import { createRulesStore } from "../shared/createRulesStore";
import { SNAP_RULES_DEFAULTS, type SnapRules } from "./rulesDefaults";

export const snapRulesStore = createRulesStore<SnapRules>("snapRules", SNAP_RULES_DEFAULTS);
