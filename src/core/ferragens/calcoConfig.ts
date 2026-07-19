/**
 * Configuracao e helpers da ferragem "Calco" (Refs 00 e 03).
 * Apresentacao / BOM — nao altera CNC, furos, Viewer nem cutlist dimensional.
 * Ref 1503 adiada ate regra de produto explicita.
 * Literais PT usam escapes Unicode.
 */

import { safeGetItem, safeParseJson, safeSetItem } from "../../utils/storage";
import { isCornerFixedFrontModel } from "../cornerCabinet/cornerCabinetRules";
import type { BoxModule } from "../types";

export const CALCO_MATERIAL = "Cal\u00e7o";
export const CALCO_MEDIDA = "37mm";
export const CALCO_STORAGE_KEY = "pimo_calco";

export const CALCO_00_ID = "calco_00";
export const CALCO_03_ID = "calco_03";
export const CALCO_REF_00 = "00";
export const CALCO_REF_03 = "03";

export type CalcoRefKey = "00" | "03";

export type CalcoRefConfig = {
  ativo: boolean;
  precoUnitario: number;
};

export type CalcoConfig = {
  refs: Record<CalcoRefKey, CalcoRefConfig>;
};

export const CALCO_CONFIG_DEFAULT: CalcoConfig = {
  refs: {
    "00": { ativo: true, precoUnitario: 0 },
    "03": { ativo: true, precoUnitario: 0 },
  },
};

function normalizeRef(raw: unknown, fallback: CalcoRefConfig): CalcoRefConfig {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const o = raw as Partial<CalcoRefConfig>;
  const preco = Number(o.precoUnitario);
  return {
    ativo: o.ativo !== false,
    precoUnitario: Number.isFinite(preco) && preco >= 0 ? preco : fallback.precoUnitario,
  };
}

function normalizeConfig(raw: unknown): CalcoConfig {
  const base = CALCO_CONFIG_DEFAULT;
  if (!raw || typeof raw !== "object") return structuredClone(base);
  const o = raw as { refs?: Partial<Record<CalcoRefKey, unknown>> };
  return {
    refs: {
      "00": normalizeRef(o.refs?.["00"], base.refs["00"]),
      "03": normalizeRef(o.refs?.["03"], base.refs["03"]),
    },
  };
}

export function loadCalcoConfig(): CalcoConfig {
  if (typeof window === "undefined") return structuredClone(CALCO_CONFIG_DEFAULT);
  const parsed = safeParseJson<unknown>(safeGetItem(CALCO_STORAGE_KEY));
  return normalizeConfig(parsed);
}

export function saveCalcoConfig(cfg: CalcoConfig): void {
  safeSetItem(CALCO_STORAGE_KEY, JSON.stringify(normalizeConfig(cfg)));
}

/** Portas num modulo com Frente Fixa (1 calco Ref 03 por porta). */
export function countPortasFrenteFixa(box: Pick<BoxModule, "baseCabinetId" | "portaTipo" | "doorsLayer">): number {
  if (!isCornerFixedFrontModel(box.baseCabinetId)) return 0;
  if (box.portaTipo === "sem_porta") return 0;
  const layers = box.doorsLayer ?? [];
  if (layers.length > 0) return layers.length;
  if (box.portaTipo === "porta_dupla") return 2;
  return 1;
}

export function countCalco03FromBoxes(boxes: BoxModule[]): number {
  let total = 0;
  for (const box of boxes ?? []) {
    total += countPortasFrenteFixa(box);
  }
  return total;
}

export type CalcoAggregateRow = {
  material: string;
  ref: string;
  medida: string;
  quantidade: number;
  precoUnitario: number;
};

/**
 * Linhas de calco para PDF (apos Dobradica).
 * @param dobradicaQty — qty I-Sensys (canecos) = calco Ref 00
 */
export function aggregateCalcoRowsForPdf(
  dobradicaQty: number,
  boxes: BoxModule[],
  config: CalcoConfig = loadCalcoConfig()
): CalcoAggregateRow[] {
  const rows: CalcoAggregateRow[] = [];
  const r00 = config.refs["00"];
  if (r00.ativo && dobradicaQty > 0) {
    rows.push({
      material: CALCO_MATERIAL,
      ref: CALCO_REF_00,
      medida: CALCO_MEDIDA,
      quantidade: dobradicaQty,
      precoUnitario: r00.precoUnitario,
    });
  }
  const r03 = config.refs["03"];
  const qty03 = countCalco03FromBoxes(boxes);
  if (r03.ativo && qty03 > 0) {
    rows.push({
      material: CALCO_MATERIAL,
      ref: CALCO_REF_03,
      medida: CALCO_MEDIDA,
      quantidade: qty03,
      precoUnitario: r03.precoUnitario,
    });
  }
  return rows;
}
