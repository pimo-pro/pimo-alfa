import { createRulesStore } from "../shared/createRulesStore";
import { DESIGNER_RULES_DEFAULTS, type DesignerRules } from "./rulesDefaults";

export const designerRulesStore = createRulesStore<DesignerRules>("designerRules", DESIGNER_RULES_DEFAULTS);
