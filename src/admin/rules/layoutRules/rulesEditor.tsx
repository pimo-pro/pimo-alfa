import { GenericRulesEditor } from "../shared/GenericRulesEditor";
import { LAYOUTRULES_FIELDS } from "./rulesSchema";
import { layoutRulesStore } from "./rulesStore";

export function LayoutRulesEditor() {
  return (
    <GenericRulesEditor
      title="Regras de layout"
      subtitle="Parâmetros configuráveis do motor layout."
      fields={LAYOUTRULES_FIELDS}
      store={layoutRulesStore}
    />
  );
}
