import type { RulesFieldDef } from "./types";
import { createRulesStore } from "./createRulesStore";

export function defineRulesModule<T extends object>(
  storageKey: string,
  defaults: T,
  fields: RulesFieldDef[]
) {
  const store = createRulesStore<T>(storageKey, defaults);
  return { store, fields, defaults };
}
