import { GenericRulesEditor } from "../shared/GenericRulesEditor";
import { DISTRIBUTIONRULES_FIELDS } from "./rulesSchema";
import { distributionRulesStore } from "./rulesStore";

export function DistributionRulesEditor() {
  return (
    <GenericRulesEditor
      title="Regras de distribution"
      subtitle="Parâmetros configuráveis do motor distribution."
      fields={DISTRIBUTIONRULES_FIELDS}
      store={distributionRulesStore}
    />
  );
}
