import { GenericRulesEditor } from "../shared/GenericRulesEditor";
import { MANUFACTURINGRULES_FIELDS } from "./rulesSchema";
import { manufacturingRulesStore } from "./rulesStore";

export function ManufacturingRulesEditor() {
  return (
    <GenericRulesEditor
      title="Regras de manufacturing"
      subtitle="Parâmetros configuráveis do motor manufacturing."
      fields={MANUFACTURINGRULES_FIELDS}
      store={manufacturingRulesStore}
    />
  );
}
