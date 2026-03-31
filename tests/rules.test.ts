/**
 * Testes do módulo de regras (core/rules).
 * Estrutura preparada para implementação futura.
 */

import { describe, it, expect } from "vitest";
import { defaultRulesConfig, getNumDobradicas, normalizeRulesConfig } from "../src/core/rules/rulesConfig";

describe("rules", () => {
  it("Regras da Porta (defaults): tabela 10–280cm aplicada", () => {
    const rules = defaultRulesConfig;
    expect(getNumDobradicas(80, rules)).toBe(2);
    expect(getNumDobradicas(150, rules)).toBe(3);
    expect(getNumDobradicas(180, rules)).toBe(4);
    expect(getNumDobradicas(220, rules)).toBe(5);
    expect(getNumDobradicas(250, rules)).toBe(6);
    expect(getNumDobradicas(270, rules)).toBe(7);
  });

  it("migra automaticamente tabela antiga de dobradiças para a nova", () => {
    const oldSavedRules = {
      portas: {
        ranges: [
          { min: 10, max: 50, dobradicas: 2 },
          { min: 51, max: 100, dobradicas: 3 },
          { min: 101, max: 150, dobradicas: 3 },
          { min: 151, max: 200, dobradicas: 4 },
        ],
      },
    };
    const normalized = normalizeRulesConfig(oldSavedRules);
    expect(normalized.portas.ranges).toEqual([
      { min: 10, max: 90, dobradicas: 2 },
      { min: 91, max: 160, dobradicas: 3 },
      { min: 160, max: 200, dobradicas: 4 },
      { min: 200, max: 240, dobradicas: 5 },
      { min: 240, max: 260, dobradicas: 6 },
      { min: 260, max: 280, dobradicas: 7 },
    ]);
  });
});
