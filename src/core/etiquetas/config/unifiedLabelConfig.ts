import type { LabelConfig } from "../../labelConfig/labelConfig";
import type { RulesConfig } from "../../rules/rulesConfig";
import type { SettingsSchema } from "../../settings/settingsSchema";
import { resolveLabelSystemConfig } from "../../labelSystem/resolveLabelSystemConfig";

/**
 * Wrapper de compatibilidade — delega integralmente a `resolveLabelSystemConfig` (SSOT).
 */
export function resolveUnifiedLabelConfig(
  rules: RulesConfig,
  settings?: Pick<SettingsSchema, "etiquetasQr"> | null
): LabelConfig {
  return resolveLabelSystemConfig(rules, settings, rules.labelSystemV5).labelConfig;
}
