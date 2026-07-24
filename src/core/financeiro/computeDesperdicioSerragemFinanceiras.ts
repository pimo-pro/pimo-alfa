/**
 * P3.9 F3b — monetização desperdício + serragem.
 * Flags Orçamentos off / €=0 ? baseline intacto. 1× por snapshot.
 */

import type { CutListItemComPreco } from "../types";
import { getLayoutKerfMmForCncNesting } from "../cnc/tcnGenerator";
import { getSettings } from "../settings/settingsService";
import type { OrcamentosCustosIndustriaisSettings } from "../orcamentos";

export type DesperdicioSerragemTarifas = Pick<
  OrcamentosCustosIndustriaisSettings,
  "desperdicioEurPorM2" | "serragemEurPorM2" | "enableDesperdicio" | "enableSerragem"
>;

export type DesperdicioSerragemFinanceirasResult = {
  wasteM2: number;
  serragemM2: number;
  precoDesperdicio: number;
  precoSerragem: number;
  precoTotal: number;
  desperdicioByPieceId: Map<string, number>;
  serragemByPieceId: Map<string, number>;
  eurByPieceId: Map<string, number>;
  warnings: string[];
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function numTarifa(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function boolFlag(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

export function resolveDesperdicioSerragemTarifas(
  override?: Partial<DesperdicioSerragemTarifas> | null
): DesperdicioSerragemTarifas {
  const fromSettings = (() => {
    try {
      return getSettings().orcamentos?.custosIndustriais;
    } catch {
      return undefined;
    }
  })();
  const src = { ...fromSettings, ...override };
  return {
    desperdicioEurPorM2: numTarifa(src.desperdicioEurPorM2),
    serragemEurPorM2: numTarifa(src.serragemEurPorM2),
    enableDesperdicio: boolFlag(src.enableDesperdicio, false),
    enableSerragem: boolFlag(src.enableSerragem, false),
  };
}

/** Serragem estimada (kerf CNC × perímetro). Exportada — era privada no Unificado. */
export function estimateSerragemM2(cutlist: CutListItemComPreco[]): number {
  let kerf = 0;
  try {
    kerf = getLayoutKerfMmForCncNesting(getSettings());
  } catch {
    kerf = 0;
  }
  if (!(kerf > 0) || cutlist.length === 0) return 0;
  let mm2 = 0;
  for (const item of cutlist) {
    const w = item.dimensoes?.largura ?? 0;
    const h = item.dimensoes?.altura ?? 0;
    const qty = item.quantidade ?? 1;
    if (w <= 0 || h <= 0) continue;
    mm2 += 2 * (w + h) * kerf * 0.5 * qty;
  }
  return mm2 / 1_000_000;
}

function pieceAreaMm2(item: CutListItemComPreco): number {
  const w = item.dimensoes?.largura ?? 0;
  const h = item.dimensoes?.altura ?? 0;
  const qty = item.quantidade ?? 1;
  if (w <= 0 || h <= 0) return 0;
  return w * h * qty;
}

/**
 * Monetiza waste + serragem com flags Orçamentos; rateia por área às peças.
 */
export function computeDesperdicioSerragemFinanceiras(input: {
  cutlist: CutListItemComPreco[];
  /** m² de desperdício (chapas reais). 0 se estimado / sem sheets. */
  wasteM2: number;
  serragemM2?: number;
  tarifas?: Partial<DesperdicioSerragemTarifas> | null;
}): DesperdicioSerragemFinanceirasResult {
  const tarifas = resolveDesperdicioSerragemTarifas(input.tarifas);
  const cutlist = input.cutlist ?? [];
  const wasteM2 =
    typeof input.wasteM2 === "number" && Number.isFinite(input.wasteM2) && input.wasteM2 > 0
      ? input.wasteM2
      : 0;
  const serragemM2 =
    typeof input.serragemM2 === "number" && Number.isFinite(input.serragemM2)
      ? Math.max(0, input.serragemM2)
      : estimateSerragemM2(cutlist);

  const warnings: string[] = [];
  if (!tarifas.enableDesperdicio) {
    warnings.push("enableDesperdicio=false — custo desperdicio = 0");
  } else if (!(wasteM2 > 0)) {
    warnings.push("wasteM2=0 (chapas estimadas ou sem nesting) — custo desperdicio = 0");
  }
  if (!tarifas.enableSerragem) {
    warnings.push("enableSerragem=false — custo serragem = 0");
  }

  const precoDesperdicio =
    tarifas.enableDesperdicio && wasteM2 > 0 && tarifas.desperdicioEurPorM2 > 0
      ? round2(wasteM2 * tarifas.desperdicioEurPorM2)
      : 0;
  const precoSerragem =
    tarifas.enableSerragem && serragemM2 > 0 && tarifas.serragemEurPorM2 > 0
      ? round2(serragemM2 * tarifas.serragemEurPorM2)
      : 0;

  const desperdicioByPieceId = new Map<string, number>();
  const serragemByPieceId = new Map<string, number>();
  const eurByPieceId = new Map<string, number>();

  const areas = cutlist.map((item) => ({
    id: String(item.id ?? ""),
    area: pieceAreaMm2(item),
  }));
  const areaSum = areas.reduce((s, a) => s + a.area, 0);

  if (areaSum > 0 && (precoDesperdicio > 0 || precoSerragem > 0)) {
    for (const { id, area } of areas) {
      if (!(area > 0) || !id) continue;
      const share = area / areaSum;
      const d = precoDesperdicio > 0 ? round2(precoDesperdicio * share) : 0;
      const s = precoSerragem > 0 ? round2(precoSerragem * share) : 0;
      if (d > 0) desperdicioByPieceId.set(id, d);
      if (s > 0) serragemByPieceId.set(id, s);
      const t = round2(d + s);
      if (t > 0) eurByPieceId.set(id, t);
    }
    // Ajuste residual no último piece com área para fechar ?
    reconcileMaps(desperdicioByPieceId, precoDesperdicio, areas);
    reconcileMaps(serragemByPieceId, precoSerragem, areas);
    for (const { id } of areas) {
      if (!id) continue;
      const t = round2(
        (desperdicioByPieceId.get(id) ?? 0) + (serragemByPieceId.get(id) ?? 0)
      );
      if (t > 0) eurByPieceId.set(id, t);
      else eurByPieceId.delete(id);
    }
  }

  return {
    wasteM2,
    serragemM2,
    precoDesperdicio,
    precoSerragem,
    precoTotal: round2(precoDesperdicio + precoSerragem),
    desperdicioByPieceId,
    serragemByPieceId,
    eurByPieceId,
    warnings,
  };
}

function reconcileMaps(
  map: Map<string, number>,
  target: number,
  areas: Array<{ id: string; area: number }>
): void {
  if (!(target > 0) || map.size === 0) return;
  let sum = 0;
  for (const v of map.values()) sum += v;
  sum = round2(sum);
  const delta = round2(target - sum);
  if (Math.abs(delta) < 0.005) return;
  // último com área > 0
  for (let i = areas.length - 1; i >= 0; i--) {
    const id = areas[i].id;
    if (!(areas[i].area > 0) || !id || !map.has(id)) continue;
    map.set(id, round2((map.get(id) ?? 0) + delta));
    break;
  }
}
