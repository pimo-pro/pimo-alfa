/**
 * Fase 2 — montagem por gaveta (bucket financeiro Gavetas).
 * Madeira das peças vai para Painéis; este módulo só resolve tarifa × quantidade.
 */

import { resolveActiveGavetasCount } from "../drawers/drawerModeloAGate";
import { getSettings } from "../settings/settingsService";
import type { BoxModule } from "../types";

/** Default de fábrica — Orçamentos / pricing.json `maoDeObra.montagem_gaveta`. */
export const CUSTO_MONTAGEM_POR_GAVETA_DEFAULT_EUR = 15;

/**
 * Tarifa EUR/gaveta a partir de Orçamentos (`custoMontagemPorPeca` = montagem por gaveta).
 * Fallback: 15 EUR.
 */
export function resolveCustoMontagemPorGavetaEur(
  overrideEur?: number | null
): number {
  if (typeof overrideEur === "number" && Number.isFinite(overrideEur) && overrideEur >= 0) {
    // Legado 22 EUR → default 15 (mesmo se override explícito residual).
    return overrideEur === 22 ? CUSTO_MONTAGEM_POR_GAVETA_DEFAULT_EUR : overrideEur;
  }
  try {
    const v = getSettings().orcamentos?.custosIndustriais?.custoMontagemPorPeca;
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      return v === 22 ? CUSTO_MONTAGEM_POR_GAVETA_DEFAULT_EUR : v;
    }
  } catch {
    /* ignore */
  }
  return CUSTO_MONTAGEM_POR_GAVETA_DEFAULT_EUR;
}

export function countGavetasInBoxes(
  boxes: Array<{ gavetas?: number | null; drawersLayer?: BoxModule["drawersLayer"] }>
): number {
  return boxes.reduce((n, box) => n + resolveActiveGavetasCount(box), 0);
}

export function computeMontagemGavetasEur(
  boxes: Array<{ gavetas?: number | null; drawersLayer?: BoxModule["drawersLayer"] }>,
  overrideEur?: number | null
): { gavetasCount: number; custoUnitario: number; total: number } {
  const gavetasCount = countGavetasInBoxes(boxes);
  const custoUnitario = resolveCustoMontagemPorGavetaEur(overrideEur);
  return {
    gavetasCount,
    custoUnitario,
    total: Math.round(gavetasCount * custoUnitario * 100) / 100,
  };
}
