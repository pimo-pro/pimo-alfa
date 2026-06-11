import { createRulesStore } from "../shared/createRulesStore";
import { SHELF_RULES_DEFAULTS, type ShelfRules } from "./rulesDefaults";

export const shelfRulesStore = createRulesStore<ShelfRules>("shelfRules", SHELF_RULES_DEFAULTS);
