import { GenericRulesEditor } from "../shared/GenericRulesEditor";
import { PREDICTIVERULES_FIELDS } from "./rulesSchema";
import { predictiveRulesStore } from "./rulesStore";

export function PredictiveRulesEditor() {
  return (
    <GenericRulesEditor
      title="Regras de predictive"
      subtitle="Parâmetros configuráveis do motor predictive."
      fields={PREDICTIVERULES_FIELDS}
      store={predictiveRulesStore}
    />
  );
}
