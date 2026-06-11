import { GenericRulesEditor } from "../shared/GenericRulesEditor";
import { COST_RULES_FIELDS } from "./rulesSchema";
import { costRulesStore } from "./rulesStore";

export function CostRulesEditor() {
  return (
    <GenericRulesEditor
      title="Regras de Custo"
      subtitle="Parâmetros do Intelligent Cost Estimator (Fase 9). Escala relativa — não altera preços industriais."
      fields={COST_RULES_FIELDS}
      store={costRulesStore}
    />
  );
}
