import { createRulesStore } from "../shared/createRulesStore";
import { MANUFACTURING_RULES_DEFAULTS, type ManufacturingRules } from "./rulesDefaults";

export const manufacturingRulesStore = createRulesStore<ManufacturingRules>("manufacturingRules", MANUFACTURING_RULES_DEFAULTS);
