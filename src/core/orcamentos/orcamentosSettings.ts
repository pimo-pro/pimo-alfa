/**
 * P3.9 — defaults + normalização Orçamentos.
 * Day-1: € a 0, flags off, enableUnificacao false.
 */

import type {
  OrcamentosMargemModo,
  OrcamentosMaterialCostMode,
  OrcamentosMontagemAvancadaModo,
  OrcamentosSettings,
} from "./orcamentosTypes";

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function defaultOrcamentosSettings(): OrcamentosSettings {
  return {
    perfuracoes: {
      drillEurPorFuro: 0,
      nestingEurPorOperacao: 0,
    },
    custosIndustriais: {
      desperdicioEurPorM2: 0,
      serragemEurPorM2: 0,
      custoChapaReal: 0,
      custoOperacoesEspeciais: 0,
      valorHoraMaquina: 0,
      custoLogisticaPorKg: 0,
      custoMontagemPorPeca: 0,
      materialCostMode: "por_peca",
      enableDesperdicio: false,
      enableSerragem: false,
      enableLogistica: false,
      enableMaoDeObra: false,
    },
    montagemAvancada: {
      modo: "off",
      precoPorM2: 0,
      precoPorCaixa: 0,
      precoGavetas: 0,
      precoRemate: 0,
      precoFerragensMontagem: 0,
    },
    margemGanho: {
      enabled: false,
      modo: "percentual",
      valor: 0,
    },
    ferragens: {
      enableUnificacao: false,
    },
  };
}

const MATERIAL_MODES: OrcamentosMaterialCostMode[] = ["por_peca", "por_chapas_reais"];
const MONTAGEM_MODOS: OrcamentosMontagemAvancadaModo[] = ["off", "m2", "caixa", "peca"];
const MARGEM_MODOS: OrcamentosMargemModo[] = ["percentual", "fixo"];

export function normalizeOrcamentosSettings(raw: unknown): OrcamentosSettings {
  const d = defaultOrcamentosSettings();
  if (!isObject(raw)) return d;

  const perf = isObject(raw.perfuracoes) ? raw.perfuracoes : {};
  const custos = isObject(raw.custosIndustriais) ? raw.custosIndustriais : {};
  const mont = isObject(raw.montagemAvancada) ? raw.montagemAvancada : {};
  const margem = isObject(raw.margemGanho) ? raw.margemGanho : {};
  const ferr = isObject(raw.ferragens) ? raw.ferragens : {};

  const materialCostMode = MATERIAL_MODES.includes(
    custos.materialCostMode as OrcamentosMaterialCostMode
  )
    ? (custos.materialCostMode as OrcamentosMaterialCostMode)
    : d.custosIndustriais.materialCostMode;

  const montModo = MONTAGEM_MODOS.includes(mont.modo as OrcamentosMontagemAvancadaModo)
    ? (mont.modo as OrcamentosMontagemAvancadaModo)
    : d.montagemAvancada.modo;

  const margemModo = MARGEM_MODOS.includes(margem.modo as OrcamentosMargemModo)
    ? (margem.modo as OrcamentosMargemModo)
    : d.margemGanho.modo;

  return {
    perfuracoes: {
      drillEurPorFuro: num(perf.drillEurPorFuro, d.perfuracoes.drillEurPorFuro),
      nestingEurPorOperacao: num(perf.nestingEurPorOperacao, d.perfuracoes.nestingEurPorOperacao),
    },
    custosIndustriais: {
      desperdicioEurPorM2: num(custos.desperdicioEurPorM2, d.custosIndustriais.desperdicioEurPorM2),
      serragemEurPorM2: num(custos.serragemEurPorM2, d.custosIndustriais.serragemEurPorM2),
      custoChapaReal: num(custos.custoChapaReal, d.custosIndustriais.custoChapaReal),
      custoOperacoesEspeciais: num(
        custos.custoOperacoesEspeciais,
        d.custosIndustriais.custoOperacoesEspeciais
      ),
      valorHoraMaquina: num(custos.valorHoraMaquina, d.custosIndustriais.valorHoraMaquina),
      custoLogisticaPorKg: num(custos.custoLogisticaPorKg, d.custosIndustriais.custoLogisticaPorKg),
      custoMontagemPorPeca: num(
        custos.custoMontagemPorPeca,
        d.custosIndustriais.custoMontagemPorPeca
      ),
      materialCostMode,
      enableDesperdicio: bool(custos.enableDesperdicio, d.custosIndustriais.enableDesperdicio),
      enableSerragem: bool(custos.enableSerragem, d.custosIndustriais.enableSerragem),
      enableLogistica: bool(custos.enableLogistica, d.custosIndustriais.enableLogistica),
      enableMaoDeObra: bool(custos.enableMaoDeObra, d.custosIndustriais.enableMaoDeObra),
    },
    montagemAvancada: {
      modo: montModo,
      precoPorM2: num(mont.precoPorM2, d.montagemAvancada.precoPorM2),
      precoPorCaixa: num(mont.precoPorCaixa, d.montagemAvancada.precoPorCaixa),
      precoGavetas: num(mont.precoGavetas, d.montagemAvancada.precoGavetas),
      precoRemate: num(mont.precoRemate, d.montagemAvancada.precoRemate),
      precoFerragensMontagem: num(
        mont.precoFerragensMontagem,
        d.montagemAvancada.precoFerragensMontagem
      ),
    },
    margemGanho: {
      enabled: bool(margem.enabled, d.margemGanho.enabled),
      modo: margemModo,
      valor: num(margem.valor, d.margemGanho.valor),
    },
    ferragens: {
      enableUnificacao: bool(ferr.enableUnificacao, d.ferragens.enableUnificacao),
    },
  };
}

export function mergeOrcamentosSettings(
  base: OrcamentosSettings,
  patch: unknown
): OrcamentosSettings {
  if (!isObject(patch)) return normalizeOrcamentosSettings(base);
  const perf = isObject(patch.perfuracoes) ? patch.perfuracoes : {};
  const custos = isObject(patch.custosIndustriais) ? patch.custosIndustriais : {};
  const mont = isObject(patch.montagemAvancada) ? patch.montagemAvancada : {};
  const margem = isObject(patch.margemGanho) ? patch.margemGanho : {};
  const ferr = isObject(patch.ferragens) ? patch.ferragens : {};
  return normalizeOrcamentosSettings({
    ...base,
    ...patch,
    perfuracoes: { ...base.perfuracoes, ...perf },
    custosIndustriais: { ...base.custosIndustriais, ...custos },
    montagemAvancada: { ...base.montagemAvancada, ...mont },
    margemGanho: { ...base.margemGanho, ...margem },
    ferragens: { ...base.ferragens, ...ferr },
  });
}
