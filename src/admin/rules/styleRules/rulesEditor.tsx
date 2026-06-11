import { GenericRulesEditor } from "../shared/GenericRulesEditor";
import { STYLERULES_FIELDS } from "./rulesSchema";
import { styleRulesStore } from "./rulesStore";

export function StyleRulesEditor() {
  return (
    <GenericRulesEditor
      title="Regras de style"
      subtitle="Parâmetros configuráveis do motor style."
      fields={STYLERULES_FIELDS}
      store={styleRulesStore}
    />
  );
}
