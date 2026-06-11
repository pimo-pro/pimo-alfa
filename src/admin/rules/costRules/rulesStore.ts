import { createRulesStore } from "../shared/createRulesStore";
import { COST_RULES_DEFAULTS, type CostRules } from "./rulesDefaults";

export const costRulesStore = createRulesStore<CostRules>("costRules", COST_RULES_DEFAULTS);
