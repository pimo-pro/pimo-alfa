/**
 * SSOT de tarifas de fábrica — public/config/pricing.json
 * Local e produção leem o mesmo ficheiro (Vite public/ + deploy FTP).
 * Não altera fórmulas industriais; só defaults / baselines.
 */

import {
  normalizeOrcamentosSettings,
  type OrcamentosSettings,
} from "../orcamentos";
import {
  normalizeFinanceiroAdminSettings,
  type FinanceiroAdminSettings,
} from "../financeiro/financeiroAdminRules";

export const CENTRAL_PRICING_URL = "/config/pricing.json";

export type CentralPricingFile = {
  version: number;
  updatedAt?: string;
  notes?: Record<string, string>;
  material?: {
    precoChapaMdf19EurM2?: number;
    fallbackEurM2?: number;
    densidadePadraoKgM3?: number;
  };
  ivaPct?: number;
  orcamentos?: Partial<OrcamentosSettings> | Record<string, unknown>;
  financeiroAdmin?: Partial<FinanceiroAdminSettings> | Record<string, unknown>;
  aliases?: Record<string, string>;
};

let cached: CentralPricingFile | null = null;
let loadPromise: Promise<CentralPricingFile | null> | null = null;

/** Baseline embutido (espelha public/config/pricing.json). */
export function getBuiltinCentralPricing(): CentralPricingFile {
  return {
    version: 1,
    material: {
      precoChapaMdf19EurM2: 35,
      fallbackEurM2: 25,
      densidadePadraoKgM3: 750,
    },
    ivaPct: 23,
    orcamentos: {
      perfuracoes: { drillEurPorFuro: 0, nestingEurPorOperacao: 0 },
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
      operacoesAvancadas: {
        precoForo5mm: 0,
        precoForoCavilha10x13: 0,
        precoForoCavilha10x30: 0,
        precoForoCalcoGrupo: 0,
        precoForoDobradicaGrupo: 0,
        precoRasgoGaveta: 0,
        precoCorteManualPorMetro: 0,
        precoMeQuadrilha: 0,
      },
      ferragens: { enableUnificacao: false },
    },
    financeiroAdmin: {
      adm: { enabled: true, mode: "percentagem", valor: 10 },
      montagem: { enabled: true, mode: "fixo_por_caixa", valor: 50 },
      portes: {
        enabled: true,
        taxaBase: 25,
        porKg: 0.15,
        porM3: 40,
        porKm: 0.8,
        minimo: 35,
      },
      distanciaKmDefault: 0,
    },
  };
}

export function getCentralPricingCached(): CentralPricingFile {
  return cached ?? getBuiltinCentralPricing();
}

export function setCentralPricingCacheForTests(value: CentralPricingFile | null): void {
  cached = value;
  loadPromise = null;
}

function isHtmlPayload(text: string): boolean {
  const t = String(text || "").trim().toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html");
}

export function normalizeCentralPricing(raw: unknown): CentralPricingFile {
  const builtin = getBuiltinCentralPricing();
  if (!raw || typeof raw !== "object") return builtin;
  const src = raw as CentralPricingFile;
  const materialSrc = src.material && typeof src.material === "object" ? src.material : {};
  return {
    version: typeof src.version === "number" && Number.isFinite(src.version) ? src.version : 1,
    updatedAt: typeof src.updatedAt === "string" ? src.updatedAt : undefined,
    notes: src.notes && typeof src.notes === "object" ? src.notes : undefined,
    material: {
      precoChapaMdf19EurM2:
        typeof materialSrc.precoChapaMdf19EurM2 === "number"
          ? materialSrc.precoChapaMdf19EurM2
          : builtin.material!.precoChapaMdf19EurM2,
      fallbackEurM2:
        typeof materialSrc.fallbackEurM2 === "number"
          ? materialSrc.fallbackEurM2
          : builtin.material!.fallbackEurM2,
      densidadePadraoKgM3:
        typeof materialSrc.densidadePadraoKgM3 === "number"
          ? materialSrc.densidadePadraoKgM3
          : builtin.material!.densidadePadraoKgM3,
    },
    ivaPct:
      typeof src.ivaPct === "number" && Number.isFinite(src.ivaPct) && src.ivaPct >= 0
        ? src.ivaPct
        : builtin.ivaPct,
    orcamentos: normalizeOrcamentosSettings({
      ...(builtin.orcamentos as object),
      ...(src.orcamentos && typeof src.orcamentos === "object" ? src.orcamentos : {}),
    }),
    financeiroAdmin: normalizeFinanceiroAdminSettings({
      ...(builtin.financeiroAdmin as object),
      ...(src.financeiroAdmin && typeof src.financeiroAdmin === "object"
        ? src.financeiroAdmin
        : {}),
    }),
    aliases: src.aliases && typeof src.aliases === "object" ? src.aliases : undefined,
  };
}

/** Fetch /config/pricing.json (idempotente). Falha ? builtin (mesmos números). */
export async function loadCentralPricing(url = CENTRAL_PRICING_URL): Promise<CentralPricingFile> {
  if (cached) return cached;
  if (loadPromise) {
    const existing = await loadPromise;
    return existing ?? getBuiltinCentralPricing();
  }
  loadPromise = (async () => {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      });
      if (!res.ok) return null;
      const text = await res.text();
      if (isHtmlPayload(text)) return null;
      const parsed = normalizeCentralPricing(JSON.parse(text));
      cached = parsed;
      return parsed;
    } catch {
      return null;
    } finally {
      loadPromise = null;
    }
  })();
  const loaded = await loadPromise;
  if (!loaded) {
    cached = getBuiltinCentralPricing();
    return cached;
  }
  return loaded;
}

export function orcamentosDefaultsFromCentral(pricing?: CentralPricingFile | null): OrcamentosSettings {
  const p = pricing ?? getCentralPricingCached();
  return normalizeOrcamentosSettings(p.orcamentos ?? {});
}

export function financeiroAdminDefaultsFromCentral(
  pricing?: CentralPricingFile | null
): FinanceiroAdminSettings {
  const p = pricing ?? getCentralPricingCached();
  return normalizeFinanceiroAdminSettings(p.financeiroAdmin);
}

export function materialFallbackEurM2FromCentral(pricing?: CentralPricingFile | null): number {
  const p = pricing ?? getCentralPricingCached();
  const n = p.material?.fallbackEurM2;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : 25;
}

export function ivaPctFromCentral(pricing?: CentralPricingFile | null): number {
  const p = pricing ?? getCentralPricingCached();
  const n = p.ivaPct;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : 23;
}
