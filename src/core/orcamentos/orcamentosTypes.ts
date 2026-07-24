/**
 * P3.9 — tipos Orçamentos (tarifas Admin).
 * Fase 1: schema. Fase 2: ferragens.enableUnificacao.
 */

export type OrcamentosMaterialCostMode = "por_peca" | "por_chapas_reais";

export type OrcamentosMontagemAvancadaModo = "off" | "m2" | "caixa" | "peca";

export type OrcamentosMargemModo = "percentual" | "fixo";

export type OrcamentosPerfuracoesSettings = {
  drillEurPorFuro: number;
  nestingEurPorOperacao: number;
};

export type OrcamentosCustosIndustriaisSettings = {
  desperdicioEurPorM2: number;
  serragemEurPorM2: number;
  custoChapaReal: number;
  custoOperacoesEspeciais: number;
  valorHoraMaquina: number;
  custoLogisticaPorKg: number;
  custoMontagemPorPeca: number;
  materialCostMode: OrcamentosMaterialCostMode;
  enableDesperdicio: boolean;
  enableSerragem: boolean;
  enableLogistica: boolean;
  enableMaoDeObra: boolean;
};

export type OrcamentosMontagemAvancadaSettings = {
  modo: OrcamentosMontagemAvancadaModo;
  precoPorM2: number;
  precoPorCaixa: number;
  precoGavetas: number;
  precoRemate: number;
  precoFerragensMontagem: number;
};

export type OrcamentosMargemGanhoSettings = {
  enabled: boolean;
  modo: OrcamentosMargemModo;
  valor: number;
};

/** P3.9 F2 — unificação ferragens A?B. */
export type OrcamentosFerragensSettings = {
  /**
   * false (default): Unificado=Via A, Peças=Via B (comportamento actual).
   * true: ambos usam catálogo B + fallback A + STRICT warnings.
   */
  enableUnificacao: boolean;
};

export type OrcamentosSettings = {
  perfuracoes: OrcamentosPerfuracoesSettings;
  custosIndustriais: OrcamentosCustosIndustriaisSettings;
  montagemAvancada: OrcamentosMontagemAvancadaSettings;
  margemGanho: OrcamentosMargemGanhoSettings;
  ferragens: OrcamentosFerragensSettings;
};
