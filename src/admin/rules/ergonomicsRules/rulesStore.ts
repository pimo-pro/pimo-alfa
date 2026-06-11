import { createRulesStore } from "../shared/createRulesStore";
import { ERGONOMICS_RULES_DEFAULTS, type ErgonomicsRules } from "./rulesDefaults";

export const ergonomicsRulesStore = createRulesStore<ErgonomicsRules>("ergonomicsRules", ERGONOMICS_RULES_DEFAULTS);
