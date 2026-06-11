import { GenericRulesEditor } from "../shared/GenericRulesEditor";
import { ERGONOMICSRULES_FIELDS } from "./rulesSchema";
import { ergonomicsRulesStore } from "./rulesStore";

export function ErgonomicsRulesEditor() {
  return (
    <GenericRulesEditor
      title="Regras de ergonomics"
      subtitle="Parâmetros configuráveis do motor ergonomics."
      fields={ERGONOMICSRULES_FIELDS}
      store={ergonomicsRulesStore}
    />
  );
}
