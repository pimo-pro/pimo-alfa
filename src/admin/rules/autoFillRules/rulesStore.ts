import { createRulesStore } from "../shared/createRulesStore";
import { AUTO_FILL_RULES_DEFAULTS, type AutoFillRules } from "./rulesDefaults";

export const autoFillRulesStore = createRulesStore<AutoFillRules>("autoFillRules", AUTO_FILL_RULES_DEFAULTS);
