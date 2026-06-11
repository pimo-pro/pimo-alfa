import type { RulesFieldDef } from "../shared/types";
import type { ConversationRules } from "./rulesDefaults";

export const CONVERSATIONRULES_FIELDS: RulesFieldDef[] = [
  { key: "minIntentConfidence", label: "Min Intent Confidence", type: "number", section: "Conversacao", min: 0, step: 0.01 },
  { key: "maxHistoryEntries", label: "Max History Entries", type: "number", section: "Conversacao", min: 0, step: 1 },
  { key: "enableCostIntents", label: "Enable Cost Intents", type: "boolean", section: "Intencoes" },
  { key: "enableManufacturingIntents", label: "Enable Manufacturing Intents", type: "boolean", section: "Intencoes" },
  { key: "enableStyleIntents", label: "Enable Style Intents", type: "boolean", section: "Intencoes" },
];

export type { ConversationRules };
