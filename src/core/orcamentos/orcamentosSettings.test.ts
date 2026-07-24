import { describe, expect, it } from "vitest";
import {
  defaultOrcamentosSettings,
  mergeOrcamentosSettings,
  normalizeOrcamentosSettings,
} from "./orcamentosSettings";

describe("orcamentosSettings (P3.9)", () => {
  it("defaults are day-1 neutral (0 € / flags off / unificacao off)", () => {
    const d = defaultOrcamentosSettings();
    expect(d.perfuracoes.drillEurPorFuro).toBe(0);
    expect(d.custosIndustriais.enableDesperdicio).toBe(false);
    expect(d.margemGanho.enabled).toBe(false);
    expect(d.ferragens.enableUnificacao).toBe(false);
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
