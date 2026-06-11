export type ConversationRules = {
  minIntentConfidence: number;
  maxHistoryEntries: number;
  enableCostIntents: boolean;
  enableManufacturingIntents: boolean;
  enableStyleIntents: boolean;
};

export const CONVERSATION_RULES_DEFAULTS: ConversationRules = {
  "minIntentConfidence": 0.75,
  "maxHistoryEntries": 50,
  "enableCostIntents": true,
  "enableManufacturingIntents": true,
  "enableStyleIntents": true
};
