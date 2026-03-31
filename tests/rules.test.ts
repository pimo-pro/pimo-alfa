/**
 * Testes do módulo de regras (core/rules).
 * Estrutura preparada para implementação futura.
 */

import { describe, it, expect } from "vitest";
import { defaultRulesConfig, getNumDobradicas, normalizeRulesConfig } from "../src/core/rules/rulesConfig";

describe("rules", () => {
  it("Regras da Porta (defaults): tabela em mm aplicada", () => {
    const rules = defaultRulesConfig;
    expect(getNumDobradicas(800, rules)).toBe(2);
    expect(getNumDobradicas(1500, rules)).toBe(3);
    expect(getNumDobradicas(1800, rules)).toBe(4);
    expect(getNumDobradicas(2200, rules)).toBe(5);
    expect(getNumDobradicas(2500, rules)).toBe(6);
    expect(getNumDobradicas(2700, rules)).toBe(7);
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
      { min: 100, max: 900, dobradicas: 2 },
      { min: 901, max: 1600, dobradicas: 3 },
      { min: 1601, max: 2000, dobradicas: 4 },
      { min: 2001, max: 2400, dobradicas: 5 },
      { min: 2401, max: 2600, dobradicas: 6 },
      { min: 2601, max: 2800, dobradicas: 7 },
    ]);
  });
});
