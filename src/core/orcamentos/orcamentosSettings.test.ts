import { describe, expect, it } from "vitest";
import {
  defaultOrcamentosSettings,
  isOrcamentosDay1IndustrialStub,
  mergeOrcamentosSettings,
  normalizeOrcamentosSettings,
} from "./orcamentosSettings";
import { ORCAMENTOS_MATERIAL_COST_MODE_DEFAULT } from "./chapasReaisActivation";

describe("orcamentosSettings (P3.9)", () => {
  it("defaults are day-1 neutral (0 / flags off / unificacao off)", () => {
    const d = defaultOrcamentosSettings();
    expect(d.perfuracoes.drillEurPorFuro).toBe(0);
    expect(d.custosIndustriais.enableDesperdicio).toBe(false);
    expect(d.margemGanho.enabled).toBe(false);
    expect(d.ferragens.enableUnificacao).toBe(false);
    expect(d.operacoesAvancadas.precoForo5mm).toBe(0);
    expect(d.operacoesAvancadas.precoMeQuadrilha).toBe(0);
  });

  it("Fase 5E — default materialCostMode permanece por_peca (activação só Admin)", () => {
    expect(ORCAMENTOS_MATERIAL_COST_MODE_DEFAULT).toBe("por_peca");
    expect(defaultOrcamentosSettings().custosIndustriais.materialCostMode).toBe("por_peca");
    expect(
      normalizeOrcamentosSettings({}).custosIndustriais.materialCostMode
    ).toBe("por_peca");
  });

  it("legado custoMontagemPorPeca=22 → normaliza para 15 EUR", () => {
    const n = normalizeOrcamentosSettings({
      custosIndustriais: { custoMontagemPorPeca: 22 },
    });
    expect(n.custosIndustriais.custoMontagemPorPeca).toBe(15);
  });

  it("isOrcamentosDay1IndustrialStub detecta stub day-1", () => {
    expect(isOrcamentosDay1IndustrialStub(defaultOrcamentosSettings())).toBe(true);
    expect(
      isOrcamentosDay1IndustrialStub({
        custosIndustriais: {
          enableDesperdicio: true,
          enableSerragem: true,
          enableMaoDeObra: true,
          valorHoraMaquina: 35,
          serragemEurPorM2: 0.8,
        },
        perfuracoes: { drillEurPorFuro: 0.0225 },
      })
    ).toBe(false);
  });

  it("normalize fills missing operacoesAvancadas", () => {
    const n = normalizeOrcamentosSettings({
      perfuracoes: { drillEurPorFuro: 0.05 },
    });
    expect(n.operacoesAvancadas.precoForoCalcoGrupo).toBe(0);
    expect(n.ferragens.enableUnificacao).toBe(false);
  });

  it("normalize fills missing ferragens block", () => {
    const n = normalizeOrcamentosSettings({
      perfuracoes: { drillEurPorFuro: 0.05 },
    });
    expect(n.ferragens.enableUnificacao).toBe(false);
    expect(n.perfuracoes.drillEurPorFuro).toBe(0.05);
  });

  it("merge preserves enableUnificacao", () => {
    const base = defaultOrcamentosSettings();
    const m = mergeOrcamentosSettings(base, {
      ferragens: { enableUnificacao: true },
    });
    expect(m.ferragens.enableUnificacao).toBe(true);
  });
});
