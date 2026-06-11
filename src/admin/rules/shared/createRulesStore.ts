import type { RulesStore } from "./types";

const STORAGE_PREFIX = "pimo_rules_v1_";

export function createRulesStore<T extends object>(storageKey: string, defaults: T): RulesStore<T> {
  const key = `${STORAGE_PREFIX}${storageKey}`;
  let state: T = load(key, defaults);
  const listeners = new Set<() => void>();

  function load(storage: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(storage);
      if (!raw) return structuredClone(fallback);
      return { ...structuredClone(fallback), ...JSON.parse(raw) };
    } catch {
      return structuredClone(fallback);
    }
  }

  function persist(): void {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore quota */
    }
  }

  function notify(): void {
    for (const fn of listeners) fn();
  }

  return {
    get: () => state,
    set: (value) => {
      state = structuredClone(value);
      persist();
      notify();
    },
    patch: (partial) => {
      state = { ...state, ...partial };
      persist();
      notify();
    },
    reset: () => {
      state = structuredClone(defaults);
      persist();
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
