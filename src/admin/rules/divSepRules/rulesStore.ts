import { defineRulesModule } from "../shared/defineRulesModule";
import { DIV_SEP_RULES_DEFAULTS } from "./rulesDefaults";

export const { store: divSepRulesStore } = defineRulesModule(
  "pimo_div_sep_rules_v1",
  DIV_SEP_RULES_DEFAULTS,
  []
);
