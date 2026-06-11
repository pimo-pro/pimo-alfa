import { GenericRulesEditor } from "../shared/GenericRulesEditor";
import { SCORINGRULES_FIELDS } from "./rulesSchema";
import { scoringRulesStore } from "./rulesStore";

export function ScoringRulesEditor() {
  return (
    <GenericRulesEditor
      title="Regras de scoring"
      subtitle="Parâmetros configuráveis do motor scoring."
      fields={SCORINGRULES_FIELDS}
      store={scoringRulesStore}
    />
  );
}
