import { createRulesStore } from "../shared/createRulesStore";
import { CONVERSATION_RULES_DEFAULTS, type ConversationRules } from "./rulesDefaults";

export const conversationRulesStore = createRulesStore<ConversationRules>("conversationRules", CONVERSATION_RULES_DEFAULTS);
