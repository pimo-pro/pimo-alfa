/**
 * P3.5/P3.6 — Financeiro Unificado (tipos SSOT).
 * Overrides + admin settings persistem no projeto.
 */

import {
  defaultFinanceiroAdminSettings,
  normalizeFinanceiroAdminSettings,
  type FinanceiroAdminSettings,
} from "./financeiroAdminRules";

export const FINANCEIRO_IVA_DEFAULT_PCT = 23;

export type FinanceiroChapasMode = "estimado" | "real";

/** Custos de materiais + administrativos. */
export type FinanceiroCustoKey =
  | "paineis"
  | "portas"
  | "gavetas"
  | "ferragens"
  | "orla"
  | "remates"
  | "adm"
  | "montagem"
  | "portes";

export type FinanceiroCustoMaterialKey =
  | "paineis"
  | "portas"
  | "gavetas"
  | "ferragens"
  | "orla"
  | "remates";

export type FinanceiroCustosOverrides = Partial<Record<FinanceiroCustoKey, number | null>>;

/** Overrides editáveis — gravados em `ProjectState.financeiroOverrides`. */
export type FinanceiroOverrides = {
  /** Percentagem de IVA (default 23). */
  ivaPct?: number;
  /** Distância de transporte (km) para cálculo de portes. */
  distanciaKm?: number;
  /** Substitui o custo calculado quando definido (número ? 0). */
  custos?: FinanceiroCustosOverrides;
  notas?: string;
};

export type FinanceiroUnificadoSnapshot = {
  caixas: number;
  pecasTotais: number;
  areaTotalM2: number;
  pesoTotalKg: number;
  /** Volume externo das caixas montadas (transporte). */
  areaTotalMontadoM3: number;
  chapas: { count: number; mode: FinanceiroChapasMode };
  desperdicioTotalM2: number;
  serragemTotalM2: number;
  ferragensTotais: number;
  orlaTotalM: number;

  /** Custos derivados (antes de overrides). */
  custosComputed: Record<FinanceiroCustoKey, number>;
  /** Custos após aplicar overrides. */
  custosEffective: Record<FinanceiroCustoKey, number>;
  custoKeysOverridden: FinanceiroCustoKey[];

  ivaPct: number;
  distanciaKm: number;
  /** Soma materiais (sem ADM/montagem/portes/IVA). */
  subtotal: number;
  /** Subtotal materiais + ADM + montagem + portes (base tributável de serviços; IVA só sobre materiais). */
  subtotalComAdmin: number;
  ivaValor: number;
  /** subtotal materiais + ADM + montagem + portes + IVA (sem margem comercial). */
  totalProjeto: number;

  overrides: FinanceiroOverrides;
  adminSettings: FinanceiroAdminSettings;
};

export const FINANCEIRO_CUSTO_MATERIAL_KEYS: FinanceiroCustoMaterialKey[] = [
  "paineis",
  "portas",
  "gavetas",
  "ferragens",
  "orla",
  "remates",
];

export const FINANCEIRO_CUSTO_KEYS: FinanceiroCustoKey[] = [
  ...FINANCEIRO_CUSTO_MATERIAL_KEYS,
  "adm",
  "montagem",
  "portes",
];

export function emptyFinanceiroOverrides(): FinanceiroOverrides {
  return {};
}

export function normalizeFinanceiroOverrides(raw: unknown): FinanceiroOverrides {
  if (!raw || typeof raw !== "object") return emptyFinanceiroOverrides();
  const src = raw as FinanceiroOverrides;
  const out: FinanceiroOverrides = {};

  if (typeof src.ivaPct === "number" && Number.isFinite(src.ivaPct) && src.ivaPct >= 0) {
    out.ivaPct = src.ivaPct;
  }

  if (typeof src.distanciaKm === "number" && Number.isFinite(src.distanciaKm) && src.distanciaKm >= 0) {
    out.distanciaKm = src.distanciaKm;
  }

  if (src.custos && typeof src.custos === "object") {
    const custos: FinanceiroCustosOverrides = {};
    for (const key of FINANCEIRO_CUSTO_KEYS) {
      const v = src.custos[key];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        custos[key] = v;
      } else if (v === null) {
        custos[key] = null;
      }
    }
    if (Object.keys(custos).length > 0) out.custos = custos;
  }

  if (typeof src.notas === "string" && src.notas.trim()) {
    out.notas = src.notas.trim();
  }

  return out;
}

export { defaultFinanceiroAdminSettings, normalizeFinanceiroAdminSettings };
export type { FinanceiroAdminSettings };
