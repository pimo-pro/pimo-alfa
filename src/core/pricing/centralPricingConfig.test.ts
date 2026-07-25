import { describe, expect, it, beforeEach } from "vitest";
import {
  getBuiltinCentralPricing,
  normalizeCentralPricing,
  orcamentosDefaultsFromCentral,
  financeiroAdminDefaultsFromCentral,
  materialFallbackEurM2FromCentral,
  setCentralPricingCacheForTests,
} from "./centralPricingConfig";

describe("centralPricingConfig", () => {
  beforeEach(() => {
    setCentralPricingCacheForTests(null);
  });

  it("builtin espelha defaults day-1", () => {
    const p = getBuiltinCentralPricing();
    expect(p.material?.precoChapaMdf19EurM2).toBe(35);
    expect(p.material?.fallbackEurM2).toBe(25);
    expect(p.ivaPct).toBe(23);
    expect(p.financeiroAdmin?.adm?.valor).toBe(10);
    expect(p.financeiroAdmin?.portes?.minimo).toBe(35);
  });

  it("normalize aplica orcamentos e financeiroAdmin", () => {
    const n = normalizeCentralPricing({
      version: 1,
      orcamentos: {
        perfuracoes: { drillEurPorFuro: 0.5, nestingEurPorOperacao: 1 },
      },
      financeiroAdmin: {
        portes: { taxaBase: 30, porKg: 0.2, porM3: 40, porKm: 0.8, minimo: 35, enabled: true },
      },
    });
    const orc = orcamentosDefaultsFromCentral(n);
    expect(orc.perfuracoes.drillEurPorFuro).toBe(0.5);
    expect(orc.perfuracoes.nestingEurPorOperacao).toBe(1);
    const fin = financeiroAdminDefaultsFromCentral(n);
    expect(fin.portes.taxaBase).toBe(30);
    expect(fin.portes.porKg).toBe(0.2);
  });

  it("fallback material vem do central", () => {
    setCentralPricingCacheForTests(
      normalizeCentralPricing({ version: 1, material: { fallbackEurM2: 22 } })
    );
    expect(materialFallbackEurM2FromCentral()).toBe(22);
  });
});
