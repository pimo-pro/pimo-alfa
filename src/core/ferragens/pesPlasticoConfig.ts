/**
 * Configuracao e helpers da ferragem oficial "Pe" (pe de plastico ajustavel).
 * Nao altera CNC, furos, Viewer nem o pipeline industrial de pecas.
 * Literais PT usam escapes Unicode para evitar corrupcao de encoding.
 */

import { safeGetItem, safeParseJson, safeSetItem } from "../../utils/storage";
import { DEFAULT_FEET_HEIGHT_MM } from "../baseCabinets/constants";
import type { BoxModule } from "../types";
import { getNumPes, type RulesConfig } from "../rules/rulesConfig";

export const PE_PLASTICO_ID = "pe_plastico";
export const PE_PLASTICO_NOME = "P\u00e9";
export const PE_PLASTICO_STORAGE_KEY = "pimo_pes_plastico";

/** Freeagem vinculada aos pés — só BOM/custo/PDF; sem furos, CNC, Viewer nem industrial. */
export const PARAFUSO_3X30_ID = "parafuso_3x30";
export const PARAFUSO_3X30_NOME = "Parafuso 3\u00d730";
export const PARAFUSO_3X30_MEDIDA = "3\u00d730mm";
export const PARAFUSO_3X30_PRECO = 0.1;
export const PARAFUSOS_POR_PE = 4;

export type PesPlasticoConfig = {
  ativo: boolean;
  precoUnitario: number;
  alturaMm: number;
  ref: string;
};

export const PES_PLASTICO_CONFIG_DEFAULT: PesPlasticoConfig = {
  ativo: true,
  // Pé plástico ajustável — custo unitário típico 0.20–0.40 €
  precoUnitario: 0.3,
  alturaMm: DEFAULT_FEET_HEIGHT_MM,
  ref: "P\u00e9-Pl\u00e1stico",
};

function normalizeConfig(raw: unknown): PesPlasticoConfig {
  const base = PES_PLASTICO_CONFIG_DEFAULT;
  if (!raw || typeof raw !== "object") return { ...base };
  const o = raw as Partial<PesPlasticoConfig>;
  const preco = Number(o.precoUnitario);
  const altura = Number(o.alturaMm);
  return {
    ativo: o.ativo !== false,
    precoUnitario: Number.isFinite(preco) && preco >= 0 ? preco : base.precoUnitario,
    alturaMm: Number.isFinite(altura) && altura > 0 ? altura : base.alturaMm,
    ref: typeof o.ref === "string" && o.ref.trim() ? o.ref.trim() : base.ref,
  };
}

export function loadPesPlasticoConfig(): PesPlasticoConfig {
  if (typeof window === "undefined") return { ...PES_PLASTICO_CONFIG_DEFAULT };
  const parsed = safeParseJson<unknown>(safeGetItem(PE_PLASTICO_STORAGE_KEY));
  return normalizeConfig(parsed);
}

export function savePesPlasticoConfig(cfg: PesPlasticoConfig): void {
  const normalized = normalizeConfig(cfg);
  safeSetItem(PE_PLASTICO_STORAGE_KEY, JSON.stringify(normalized));
}

export function boxTemPesPlastico(
  box: Pick<BoxModule, "cabinetType" | "feetEnabled">
): boolean {
  return box.cabinetType === "lower" && box.feetEnabled !== false;
}

export function quantidadePesParaCaixa(
  box: Pick<BoxModule, "dimensoes" | "cabinetType" | "feetEnabled">,
  rules?: RulesConfig
): number {
  if (!boxTemPesPlastico(box)) return 0;
  const larguraMm = Number(box.dimensoes?.largura) || 0;
  const larguraCm = larguraMm > 0 ? larguraMm / 10 : 60;
  return rules ? getNumPes(larguraCm, rules) : 4;
}

export function alturaPesMm(
  box: Pick<BoxModule, "feetHeight" | "pe_cm">,
  config: PesPlasticoConfig
): number {
  const fromBox = Number(box.feetHeight);
  if (Number.isFinite(fromBox) && fromBox > 0) return fromBox;
  const peCm = Number(box.pe_cm);
  if (Number.isFinite(peCm) && peCm > 0) return peCm * 10;
  return config.alturaMm;
}

export type PesPlasticoAggregateRow = {
  material: string;
  ref: string;
  medida: string;
  quantidade: number;
  precoUnitario: number;
};

/** Agrega pes do projeto por altura (PDF / totais). */
export function aggregatePesPlasticoFromBoxes(
  boxes: BoxModule[],
  rules?: RulesConfig,
  config: PesPlasticoConfig = loadPesPlasticoConfig()
): PesPlasticoAggregateRow[] {
  if (!config.ativo) return [];
  const byAltura = new Map<number, number>();
  for (const box of boxes ?? []) {
    const qty = quantidadePesParaCaixa(box, rules);
    if (qty <= 0) continue;
    const h = Math.round(alturaPesMm(box, config));
    byAltura.set(h, (byAltura.get(h) ?? 0) + qty);
  }
  return [...byAltura.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([h, quantidade]) => ({
      material: PE_PLASTICO_NOME,
      ref: config.ref,
      medida: `${h}mm`,
      quantidade,
      precoUnitario: config.precoUnitario,
    }));
}

export type PesPlasticoPorCaixaRow = {
  caixa: string;
  quantidade: number;
  medida: string;
  precoUnitario: number;
  precoTotal: number;
};

export function listPesPlasticoPorCaixa(
  boxes: BoxModule[],
  rules?: RulesConfig,
  config: PesPlasticoConfig = loadPesPlasticoConfig()
): PesPlasticoPorCaixaRow[] {
  if (!config.ativo) return [];
  const rows: PesPlasticoPorCaixaRow[] = [];
  for (const box of boxes ?? []) {
    const qty = quantidadePesParaCaixa(box, rules);
    if (qty <= 0) continue;
    const h = Math.round(alturaPesMm(box, config));
    rows.push({
      caixa: box.nome?.trim() || box.id,
      quantidade: qty,
      medida: `${h}mm`,
      precoUnitario: config.precoUnitario,
      precoTotal: config.precoUnitario * qty,
    });
  }
  return rows;
}

/** Quantidade de Parafuso 3×30 por caixa = pés × 4 (freeagem). */
export function quantidadeParafusos3x30ParaCaixa(
  box: Pick<BoxModule, "dimensoes" | "cabinetType" | "feetEnabled">,
  rules?: RulesConfig
): number {
  return quantidadePesParaCaixa(box, rules) * PARAFUSOS_POR_PE;
}

export type Parafuso3x30AggregateRow = {
  material: string;
  ref: string;
  medida: string;
  quantidade: number;
  precoUnitario: number;
};

/** Agrega Parafuso 3×30 do projeto (pés × 4) — PDF / totais. */
export function aggregateParafuso3x30FromBoxes(
  boxes: BoxModule[],
  rules?: RulesConfig,
  config: PesPlasticoConfig = loadPesPlasticoConfig()
): Parafuso3x30AggregateRow[] {
  if (!config.ativo) return [];
  let quantidade = 0;
  for (const box of boxes ?? []) {
    quantidade += quantidadeParafusos3x30ParaCaixa(box, rules);
  }
  if (quantidade <= 0) return [];
  return [
    {
      material: PARAFUSO_3X30_NOME,
      ref: PARAFUSO_3X30_ID,
      medida: PARAFUSO_3X30_MEDIDA,
      quantidade,
      precoUnitario: PARAFUSO_3X30_PRECO,
    },
  ];
}

export type Parafuso3x30PorCaixaRow = {
  caixa: string;
  quantidade: number;
  medida: string;
  precoUnitario: number;
  precoTotal: number;
};

export function listParafuso3x30PorCaixa(
  boxes: BoxModule[],
  rules?: RulesConfig,
  config: PesPlasticoConfig = loadPesPlasticoConfig()
): Parafuso3x30PorCaixaRow[] {
  if (!config.ativo) return [];
  const rows: Parafuso3x30PorCaixaRow[] = [];
  for (const box of boxes ?? []) {
    const qty = quantidadeParafusos3x30ParaCaixa(box, rules);
    if (qty <= 0) continue;
    rows.push({
      caixa: box.nome?.trim() || box.id,
      quantidade: qty,
      medida: PARAFUSO_3X30_MEDIDA,
      precoUnitario: PARAFUSO_3X30_PRECO,
      precoTotal: PARAFUSO_3X30_PRECO * qty,
    });
  }
  return rows;
}
