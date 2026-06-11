export type RulesFieldType = "number" | "boolean" | "text" | "select";

export type RulesFieldDef = {
  key: string;
  label: string;
  description?: string;
  type: RulesFieldType;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  section?: string;
};

export type RulesSectionMeta = {
  id: string;
  label: string;
  description: string;
};

export type RulesStore<T> = {
  get: () => T;
  set: (value: T) => void;
  patch: (partial: Partial<T>) => void;
  reset: () => void;
  subscribe: (listener: () => void) => () => void;
};
