import { GenericRulesEditor } from "../shared/GenericRulesEditor";
import { VARIATIONRULES_FIELDS } from "./rulesSchema";
import { variationRulesStore } from "./rulesStore";

export function VariationRulesEditor() {
  return (
    <GenericRulesEditor
      title="Regras de variation"
      subtitle="Parâmetros configuráveis do motor variation."
      fields={VARIATIONRULES_FIELDS}
      store={variationRulesStore}
    />
  );
}
