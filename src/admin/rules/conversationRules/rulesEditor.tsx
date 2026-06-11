import { GenericRulesEditor } from "../shared/GenericRulesEditor";
import { CONVERSATIONRULES_FIELDS } from "./rulesSchema";
import { conversationRulesStore } from "./rulesStore";

export function ConversationRulesEditor() {
  return (
    <GenericRulesEditor
      title="Regras de conversation"
      subtitle="Parâmetros configuráveis do motor conversation."
      fields={CONVERSATIONRULES_FIELDS}
      store={conversationRulesStore}
    />
  );
}
