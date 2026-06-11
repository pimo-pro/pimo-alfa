import { GenericRulesEditor } from "../shared/GenericRulesEditor";
import { ROOMRULES_FIELDS } from "./rulesSchema";
import { roomRulesStore } from "./rulesStore";

export function RoomRulesEditor() {
  return (
    <GenericRulesEditor
      title="Regras de room"
      subtitle="Parâmetros configuráveis do motor room."
      fields={ROOMRULES_FIELDS}
      store={roomRulesStore}
    />
  );
}
