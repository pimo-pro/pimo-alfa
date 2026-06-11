import { createRulesStore } from "../shared/createRulesStore";
import { STYLE_RULES_DEFAULTS, type StyleRules } from "./rulesDefaults";

export const styleRulesStore = createRulesStore<StyleRules>("styleRules", STYLE_RULES_DEFAULTS);
