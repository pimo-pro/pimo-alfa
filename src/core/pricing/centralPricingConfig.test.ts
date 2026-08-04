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

  it("builtin mercado: portes off por defeito (ativoSomenteComEscolha)", () => {
    const p = getBuiltinCentralPricing();
    expect(p.material?.precoChapaMdf19EurM2).toBe(31);
    expect(p.material?.fallbackEurM2).toBe(20);
    expect(p.ivaPct).toBe(23);
    expect(p.portes?.ativoSomenteComEscolha).toBe(true);
    expect(p.financeiroAdmin?.portes?.enabled).toBe(false);
  });

  it("normalize aplica orcamentos e financeiroAdmin legados", () => {
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

  it("orcamentosDefaultsFromCentral activa Desperdício/Serragem/MO com valorHora > 0", () => {
    const orc = orcamentosDefaultsFromCentral(getBuiltinCentralPricing());
    expect(orc.custosIndustriais.enableDesperdicio).toBe(true);
    expect(orc.custosIndustriais.enableSerragem).toBe(true);
    expect(orc.custosIndustriais.enableMaoDeObra).toBe(true);
    expect(orc.custosIndustriais.valorHoraMaquina).toBeGreaterThan(0);
    expect(orc.custosIndustriais.serragemEurPorM2).toBeGreaterThan(0);
  });

  it("MO activa não fica com valorHoraMaquina=0 após spread legado", () => {
    const n = normalizeCentralPricing({
      version: 2,
      chapas: { MDF_BRANCO_LAMINADO_19: 31, MDF_CRU_19: 20 },
      operacoes: { furo_cnc: 0.0225 },
      desperdicio: { percentual: 0.18 },
      maoDeObra: { montagem_caixa_m2: 17, montagem_gaveta: 15 },
      custosAdicionais: { serragem: 0.8, adm_percentual: 0.05, logistica: 5 },
      portes: { ativoSomenteComEscolha: true, local_kg: 3.5 },
      orcamentos: {
        custosIndustriais: {
          enableMaoDeObra: true,
          valorHoraMaquina: 0,
        },
      },
    });
    const orc = orcamentosDefaultsFromCentral(n);
    expect(orc.custosIndustriais.enableMaoDeObra).toBe(true);
    expect(orc.custosIndustriais.valorHoraMaquina).toBeGreaterThan(0);
  });

  it("fallback material vem do central", () => {
    setCentralPricingCacheForTests(
      normalizeCentralPricing({ version: 1, material: { fallbackEurM2: 22 } })
    );
    expect(materialFallbackEurM2FromCentral()).toBe(22);
  });
});
