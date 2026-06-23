import type { ErgonomicHeightRules } from "./drawerErgonomicsHeights";
import { ERGONOMICS_RULES_DEFAULTS } from "../../admin/rules/ergonomicsRules/rulesDefaults";
import { ergonomicsRulesStore } from "../../admin/rules/ergonomicsRules/rulesStore";

/** Regras de ergonomia activas (admin store → defaults). */
export function resolveDrawerErgonomicsRules(): ErgonomicHeightRules {
  try {
    const rules = ergonomicsRulesStore.get();
    return {
      baseCabinetHeightMm: rules.baseCabinetHeightMm,
      drawerClearanceMm: rules.drawerClearanceMm,
    };
  } catch {
    return {
      baseCabinetHeightMm: ERGONOMICS_RULES_DEFAULTS.baseCabinetHeightMm,
      drawerClearanceMm: ERGONOMICS_RULES_DEFAULTS.drawerClearanceMm,
    };
  }
}
