/**
 * P3.9 F3a ù SSOT operaùùes CNC/Drill financeiras.
 * CNC = perùmetro real ù corte_cnc_metro (pricing.json).
 * Drill = furos reais ù furo_cnc (exclui rasgos/grooves).
 */

import type { CutListItemComPreco } from "../types";
import { getSettings } from "../settings/settingsService";
import { getCentralPricingCached } from "../pricing/centralPricingConfig";
import type { OrcamentosPerfuracoesSettings } from "../orcamentos";

export type OperacoesFinanceirasTarifas = {
  drillEurPorFuro: number;
  /** ù/m de perùmetro de corte CNC. */
  corteEurPorMetro: number;
  /** Legado ù nùo usar para ù; mantido para compat. */
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
  override?: (Partial<OrcamentosPerfuracoesSettings> & { corteEurPorMetro?: number }) | null
): OperacoesFinanceirasTarifas {
  const fromSettings = (() => {
    try {
      return getSettings().orcamentos?.perfuracoes;
    } catch {
      return undefined;
    }
  })();
  const pricingOps = (() => {
    try {
      return getCentralPricingCached().operacoes ?? {};
    } catch {
      return {} as Record<string, number>;
    }
  })();
  const src = { ...fromSettings, ...override };
  const corteFromOverride = numTarifa(override?.corteEurPorMetro);
  // SSOT: pricing.json tem prioridade sobre settings locais stale.
  const corte =
    corteFromOverride > 0
      ? corteFromOverride
      : numTarifa((pricingOps as { corte_cnc_metro?: number }).corte_cnc_metro) || 0.14;
  const furoFromPricing = numTarifa((pricingOps as { furo_cnc?: number }).furo_cnc);
  const furo =
    typeof override?.drillEurPorFuro === "number"
      ? numTarifa(override.drillEurPorFuro)
      : furoFromPricing > 0
        ? furoFromPricing
        : numTarifa(src?.drillEurPorFuro) || 0.0225;
  return {
    drillEurPorFuro: furo,
    corteEurPorMetro:
      typeof override?.corteEurPorMetro === "number" ? corteFromOverride : corte,
    nestingEurPorOperacao: numTarifa(src?.nestingEurPorOperacao),
  };
}

/** Peùa nestùvel se tem ùrea + espessura. */
export function pieceHasCncOperacao(item: CutListItemComPreco): boolean {
  const w = item.dimensoes?.largura ?? 0;
  const h = item.dimensoes?.altura ?? 0;
  const e = item.espessura ?? item.dimensoes?.profundidade ?? 0;
  return w > 0 && h > 0 && e > 0;
}

/** Perùmetro de corte em metros (2 ù (L+A) / 1000). */
export function pieceCutPerimeterM(item: CutListItemComPreco): number {
  const w = item.dimensoes?.largura ?? 0;
  const h = item.dimensoes?.altura ?? 0;
  if (w <= 0 || h <= 0) return 0;
  return (2 * (w + h)) / 1000;
}

/** Furos reais (exclui rasgos/grooves ù cobrados sù em ops avanùadas em gavetas). */
export function pieceDrillHoleCount(item: CutListItemComPreco): number {
  const holes = item.drillHoles ?? [];
  let n = 0;
  for (const h of holes) {
    if (h.holeSubtype === "groove") continue;
    n += 1;
  }
  return n;
}

/**
 * Calcula custos CNC + Drill a partir da cutlist e tarifas.
 * Sem flat-fee por peùa; sem rasgos fantasma.
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
    const periM = pieceHasCncOperacao(item) ? pieceCutPerimeterM(item) : 0;
    const cnc =
      periM > 0 && tarifas.corteEurPorMetro > 0
        ? round2(periM * tarifas.corteEurPorMetro * qty)
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
