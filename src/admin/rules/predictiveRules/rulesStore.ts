import { createRulesStore } from "../shared/createRulesStore";
import { PREDICTIVE_RULES_DEFAULTS, type PredictiveRules } from "./rulesDefaults";

export const predictiveRulesStore = createRulesStore<PredictiveRules>("predictiveRules", PREDICTIVE_RULES_DEFAULTS);
