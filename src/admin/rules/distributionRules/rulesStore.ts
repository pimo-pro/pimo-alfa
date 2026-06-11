import { createRulesStore } from "../shared/createRulesStore";
import { DISTRIBUTION_RULES_DEFAULTS, type DistributionRules } from "./rulesDefaults";

export const distributionRulesStore = createRulesStore<DistributionRules>("distributionRules", DISTRIBUTION_RULES_DEFAULTS);
