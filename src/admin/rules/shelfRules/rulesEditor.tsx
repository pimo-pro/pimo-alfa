import { GenericRulesEditor } from "../shared/GenericRulesEditor";
import { SHELFRULES_FIELDS } from "./rulesSchema";
import { shelfRulesStore } from "./rulesStore";

export function ShelfRulesEditor() {
  return (
    <GenericRulesEditor
      title="Regras de shelf"
      subtitle="Parâmetros configuráveis do motor shelf."
      fields={SHELFRULES_FIELDS}
      store={shelfRulesStore}
    />
  );
}
