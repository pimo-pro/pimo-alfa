import { createRulesStore } from "../shared/createRulesStore";
import { LAYOUT_RULES_DEFAULTS, type LayoutRules } from "./rulesDefaults";

export const layoutRulesStore = createRulesStore<LayoutRules>("layoutRules", LAYOUT_RULES_DEFAULTS);
