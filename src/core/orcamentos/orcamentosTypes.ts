/**
 * P3.9 — tipos Orçamentos (tarifas Admin).
 * Fase 1: schema. Fase 2: ferragens.enableUnificacao.
 * Fase 4: operacoesAvancadas.
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

/** P3.9 F4 — operação extra dinâmica (reserva). */
export type OperacaoAvancada = {
  id: string;
  label: string;
  preco: number;
};

/** P3.9 F4 — operações industriais avançadas (tarifas tipadas). */
export type OrcamentosOperacoesAvancadasSettings = {
  precoForo5mm: number;
  precoForoCavilha10x13: number;
  precoForoCavilha10x30: number;
  /** Grupo de 3 furos calço = 1€. */
  precoForoCalcoGrupo: number;
  /** Grupo dobradiça (1 caneco + 2 fixação) = 1€. */
  precoForoDobradicaGrupo: number;
  precoRasgoGaveta: number;
  precoCorteManualPorMetro: number;
  precoMeQuadrilha: number;
  /** Reserva futura — lista dinâmica. */
  operacoesExtras?: OperacaoAvancada[];
};

export type OrcamentosSettings = {
  perfuracoes: OrcamentosPerfuracoesSettings;
  custosIndustriais: OrcamentosCustosIndustriaisSettings;
  operacoesAvancadas: OrcamentosOperacoesAvancadasSettings;
  montagemAvancada: OrcamentosMontagemAvancadaSettings;
  margemGanho: OrcamentosMargemGanhoSettings;
  ferragens: OrcamentosFerragensSettings;
};
