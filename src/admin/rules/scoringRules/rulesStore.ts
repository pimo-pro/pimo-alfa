import { createRulesStore } from "../shared/createRulesStore";
import { SCORING_RULES_DEFAULTS, type ScoringRules } from "./rulesDefaults";

export const scoringRulesStore = createRulesStore<ScoringRules>("scoringRules", SCORING_RULES_DEFAULTS);
