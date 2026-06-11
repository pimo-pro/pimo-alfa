import { GenericRulesEditor } from "../shared/GenericRulesEditor";
import { SNAPRULES_FIELDS } from "./rulesSchema";
import { snapRulesStore } from "./rulesStore";

export function SnapRulesEditor() {
  return (
    <GenericRulesEditor
      title="Regras de snap"
      subtitle="Parâmetros configuráveis do motor snap."
      fields={SNAPRULES_FIELDS}
      store={snapRulesStore}
    />
  );
}
