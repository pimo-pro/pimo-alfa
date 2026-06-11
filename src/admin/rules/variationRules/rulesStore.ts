import { createRulesStore } from "../shared/createRulesStore";
import { VARIATION_RULES_DEFAULTS, type VariationRules } from "./rulesDefaults";

export const variationRulesStore = createRulesStore<VariationRules>("variationRules", VARIATION_RULES_DEFAULTS);
