/**
 * P3.6 — Regras ADMIN financeiras (ADM / montagem / portes).
 * Defaults de fábrica + normalização + cálculo.
 */

export type FinanceiroValorMode = "fixo" | "percentagem";

export type FinanceiroAdmSettings = {
  enabled: boolean;
  /** fixo (€) ou % sobre subtotal de materiais. */
  mode: FinanceiroValorMode;
  valor: number;
};

export type FinanceiroMontagemMode =
  | "fixo_por_caixa"
  | "percentagem_por_caixa"
  | "fixo_total"
  | "percentagem_subtotal"
  /** € / m² de área de caixa L×A (montagem_caixa_m2 do pricing.json). */
  | "eur_por_m2";

export type FinanceiroMontagemSettings = {
  enabled: boolean;
  mode: FinanceiroMontagemMode;
  valor: number;
};

export type FinanceiroPortesSettings = {
  enabled: boolean;
  /** Taxa base (€). */
  taxaBase: number;
  /** € / kg. */
  porKg: number;
  /** € / m³. */
  porM3: number;
  /** € / km. */
  porKm: number;
  /** Mínimo a cobrar (€). */
  minimo: number;
};

export type FinanceiroAdminSettings = {
  adm: FinanceiroAdmSettings;
  montagem: FinanceiroMontagemSettings;
  portes: FinanceiroPortesSettings;
  /** Distância default (km) quando o projeto não define override. */
  distanciaKmDefault: number;
};

export type FinanceiroAdminCalcInput = {
  subtotalMateriais: number;
  caixas: number;
  /** Área das caixas em m² (Σ L×A) — usada por montagem eur_por_m2 / montagem_caixa_m2. */
  areaTotalM2?: number;
  pesoTotalKg: number;
  volumeMontadoM3: number;
  distanciaKm: number;
  settings: FinanceiroAdminSettings;
};

export type FinanceiroAdminCalcResult = {
  adm: number;
  montagem: number;
  portes: number;
  distanciaKm: number;
};

export const FINANCEIRO_ADMIN_SETTINGS_STORAGE_KEY = "pimo_financeiro_admin_settings_v1";

export function defaultFinanceiroAdminSettings(): FinanceiroAdminSettings {
  return {
    adm: { enabled: true, mode: "percentagem", valor: 10 },
    // pricing.json maoDeObra.montagem_caixa_m2 = 17 €/m²
    montagem: { enabled: true, mode: "eur_por_m2", valor: 17 },
    // Sem fallback de remates — remates/rodapés só via peças reais no Unificado.
    portes: {
      // Tarifas de fábrica; cobrança no projeto só com escolha explícita (incluirPortes).
      enabled: false,
      taxaBase: 25,
      porKg: 0.15,
      porM3: 40,
      porKm: 0.8,
      minimo: 35,
    },
    distanciaKmDefault: 0,
  };
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

export function normalizeFinanceiroAdminSettings(raw: unknown): FinanceiroAdminSettings {
  const d = defaultFinanceiroAdminSettings();
  if (!raw || typeof raw !== "object") return d;
  const src = raw as Partial<FinanceiroAdminSettings>;

  const admSrc = (src.adm ?? {}) as Partial<FinanceiroAdmSettings>;
  const montSrc = (src.montagem ?? {}) as Partial<FinanceiroMontagemSettings>;
  const portSrc = (src.portes ?? {}) as Partial<FinanceiroPortesSettings>;

  const admMode: FinanceiroValorMode =
    admSrc.mode === "fixo" || admSrc.mode === "percentagem" ? admSrc.mode : d.adm.mode;

  const montModes: FinanceiroMontagemMode[] = [
    "fixo_por_caixa",
    "percentagem_por_caixa",
    "fixo_total",
    "percentagem_subtotal",
    "eur_por_m2",
  ];
  let montMode: FinanceiroMontagemMode = montModes.includes(montSrc.mode as FinanceiroMontagemMode)
    ? (montSrc.mode as FinanceiroMontagemMode)
    : d.montagem.mode;
  let montValor = num(montSrc.valor, d.montagem.valor);
  // Migração legado: 50 €/caixa → 17 €/m² (pricing.json)
  if (montMode === "fixo_por_caixa" && montValor === 50) {
    montMode = "eur_por_m2";
    montValor = 17;
  }

  return {
    adm: {
      enabled: bool(admSrc.enabled, d.adm.enabled),
      mode: admMode,
      valor: num(admSrc.valor, d.adm.valor),
    },
    montagem: {
      enabled: bool(montSrc.enabled, d.montagem.enabled),
      mode: montMode,
      valor: montValor,
    },
    portes: {
      enabled: bool(portSrc.enabled, d.portes.enabled),
      taxaBase: num(portSrc.taxaBase, d.portes.taxaBase),
      porKg: num(portSrc.porKg, d.portes.porKg),
      porM3: num(portSrc.porM3, d.portes.porM3),
      porKm: num(portSrc.porKm, d.portes.porKm),
      minimo: num(portSrc.minimo, d.portes.minimo),
    },
    distanciaKmDefault: num(src.distanciaKmDefault, d.distanciaKmDefault),
  };
}

/** Calcula ADM / montagem / portes a partir das regras ADMIN. */
export function computeFinanceiroAdminCustos(
  input: FinanceiroAdminCalcInput
): FinanceiroAdminCalcResult {
  const {
    settings,
    subtotalMateriais,
    caixas,
    areaTotalM2 = 0,
    pesoTotalKg,
    volumeMontadoM3,
    distanciaKm,
  } = input;
  const dist = Math.max(0, distanciaKm);

  let adm = 0;
  if (settings.adm.enabled) {
    adm =
      settings.adm.mode === "percentagem"
        ? subtotalMateriais * (settings.adm.valor / 100)
        : settings.adm.valor;
  }

  let montagem = 0;
  if (settings.montagem.enabled) {
    const v = settings.montagem.valor;
    switch (settings.montagem.mode) {
      case "fixo_por_caixa":
        montagem = v * Math.max(0, caixas);
        break;
      case "percentagem_por_caixa":
        montagem = subtotalMateriais * (v / 100) * Math.max(0, caixas);
        break;
      case "fixo_total":
        montagem = v;
        break;
      case "percentagem_subtotal":
        montagem = subtotalMateriais * (v / 100);
        break;
      case "eur_por_m2":
        montagem = v * Math.max(0, areaTotalM2);
        break;
      default:
        montagem = 0;
    }
  }

  let portes = 0;
  if (settings.portes.enabled) {
    const p = settings.portes;
    const raw =
      p.taxaBase + p.porKg * pesoTotalKg + p.porM3 * volumeMontadoM3 + p.porKm * dist;
    portes = Math.max(p.minimo, raw);
  }

  return {
    adm: round2(adm),
    montagem: round2(montagem),
    portes: round2(portes),
    distanciaKm: dist,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Carrega defaults globais (Admin) — localStorage. */
export function loadGlobalFinanceiroAdminSettings(): FinanceiroAdminSettings {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(FINANCEIRO_ADMIN_SETTINGS_STORAGE_KEY) : null;
    if (!raw) return defaultFinanceiroAdminSettings();
    return normalizeFinanceiroAdminSettings(JSON.parse(raw));
  } catch {
    return defaultFinanceiroAdminSettings();
  }
}

/** Grava defaults globais (Admin). */
export function saveGlobalFinanceiroAdminSettings(settings: FinanceiroAdminSettings): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      FINANCEIRO_ADMIN_SETTINGS_STORAGE_KEY,
      JSON.stringify(normalizeFinanceiroAdminSettings(settings))
    );
  } catch {
    /* ignore */
  }
}
