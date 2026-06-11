import { GenericRulesEditor } from "../shared/GenericRulesEditor";
import { AUTOFILLRULES_FIELDS } from "./rulesSchema";
import { autoFillRulesStore } from "./rulesStore";

export function AutoFillRulesEditor() {
  return (
    <GenericRulesEditor
      title="Regras de auto Fill"
      subtitle="Parâmetros configuráveis do motor auto Fill."
      fields={AUTOFILLRULES_FIELDS}
      store={autoFillRulesStore}
    />
  );
}
