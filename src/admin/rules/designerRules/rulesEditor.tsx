import { GenericRulesEditor } from "../shared/GenericRulesEditor";
import { DESIGNERRULES_FIELDS } from "./rulesSchema";
import { designerRulesStore } from "./rulesStore";

export function DesignerRulesEditor() {
  return (
    <GenericRulesEditor
      title="Regras de designer"
      subtitle="Parâmetros configuráveis do motor designer."
      fields={DESIGNERRULES_FIELDS}
      store={designerRulesStore}
    />
  );
}
