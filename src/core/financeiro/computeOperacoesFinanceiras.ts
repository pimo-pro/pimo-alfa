/**
 * P3.9 F3a — SSOT operações CNC/Drill financeiras.
 * Tarifas: orcamentos.perfuracoes (defaults 0). Não altera CNC/TCN/cutlist.
 */

import type { CutListItemComPreco } from "../types";
import { getSettings } from "../settings/settingsService";
import type { OrcamentosPerfuracoesSettings } from "../orcamentos";

export type OperacoesFinanceirasTarifas = {
  drillEurPorFuro: number;
  nestingEurPorOperacao: number;
};

export type OperacoesFinanceirasResult = {
  precoCNC: number;
  precoDrill: number;
  precoTotal: number;
  eurByPieceId: Map<string, number>;
  cncByPieceId: Map<string, number>;
  drillByPieceId: Map<string, number>;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function numTarifa(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function resolveOperacoesTarifas(
  override?: Partial<OrcamentosPerfuracoesSettings> | null
): OperacoesFinanceirasTarifas {
  const fromSettings = (() => {
    try {
      return getSettings().orcamentos?.perfuracoes;
    } catch {
      return undefined;
    }
  })();
  const src = override ?? fromSettings;
  return {
    drillEurPorFuro: numTarifa(src?.drillEurPorFuro),
    nestingEurPorOperacao: numTarifa(src?.nestingEurPorOperacao),
  };
}

/** Heurística Peças P3.8: peça nestável se tem área + espessura. */
export function pieceHasCncOperacao(item: CutListItemComPreco): boolean {
  const w = item.dimensoes?.largura ?? 0;
  const h = item.dimensoes?.altura ?? 0;
  const e = item.espessura ?? item.dimensoes?.profundidade ?? 0;
  return w > 0 && h > 0 && e > 0;
}

export function pieceDrillHoleCount(item: CutListItemComPreco): number {
  return item.drillHoles?.length ?? 0;
}

/**
 * Calcula custos CNC + Drill a partir da cutlist e tarifas Orçamentos.
 */
export function computeOperacoesFinanceiras(
  cutlist: CutListItemComPreco[],
  perfuracoes?: Partial<OrcamentosPerfuracoesSettings> | null
): OperacoesFinanceirasResult {
  const tarifas = resolveOperacoesTarifas(perfuracoes);
  const eurByPieceId = new Map<string, number>();
  const cncByPieceId = new Map<string, number>();
  const drillByPieceId = new Map<string, number>();
  let precoCNC = 0;
  let precoDrill = 0;

  for (const item of cutlist ?? []) {
    const pieceId = String(item.id ?? "");
    const qty = Math.max(1, item.quantidade ?? 1);
    const cnc =
      pieceHasCncOperacao(item) && tarifas.nestingEurPorOperacao > 0
        ? round2(tarifas.nestingEurPorOperacao * qty)
        : 0;
    const holes = pieceDrillHoleCount(item);
    const drill =
      holes > 0 && tarifas.drillEurPorFuro > 0
        ? round2(holes * tarifas.drillEurPorFuro * qty)
        : 0;
    const total = round2(cnc + drill);
    if (cnc > 0) cncByPieceId.set(pieceId, cnc);
    if (drill > 0) drillByPieceId.set(pieceId, drill);
    if (total > 0) eurByPieceId.set(pieceId, total);
    precoCNC = round2(precoCNC + cnc);
    precoDrill = round2(precoDrill + drill);
  }

  return {
    precoCNC,
    precoDrill,
    precoTotal: round2(precoCNC + precoDrill),
    eurByPieceId,
    cncByPieceId,
    drillByPieceId,
  };
}
