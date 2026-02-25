/**
 * Settings Engine central.
 * Estrutura base de configurações globais (persistência + validação + migração leve).
 */

export const SETTINGS_STORAGE_KEY = "pimo_system_settings_v1";
const SETTINGS_SCHEMA_VERSION = 1;

export interface SettingsSchema {
  schemaVersion: number;
  geral: {
    locale: string;
    theme: "dark" | "light" | "system";
    autosaveEnabled: boolean;
    debugMode: boolean;
  };
  fabrica: {
    larguraChapaPadraoMm: number;
    alturaChapaPadraoMm: number;
    espessuraPadraoMm: number;
    toleranciaCorteMm: number;
  };
  precos: {
    margemPercentual: number;
    multiplicadorBase: number;
    valorHoraMaquina: number;
  };
  materiais: {
    categoriaPadraoId: string;
    presetVisualPadraoId: string;
    materialIndustrialPadraoId: string;
  };
  cnc: {
    profundidadeCortePadraoMm: number;
    offsetFerramentaPadraoMm: number;
    toleranciaPosicionamentoMm: number;
  };
  nesting: {
    kerfPadraoMm: number;
    permitirRotacaoGlobal: boolean;
    prioridadeAproveitamento: "area" | "chapas" | "balanceado";
  };
  portas: {
    portaGapVerticalMm: number;
    portaGapHorizontalMm: number;
    portaGapDuplaMm: number;
    portaPosZOffsetMm: number;
  };
  gavetas: {
    gavetaNormalBaseEspessuraMm: number;
    gavetaProBaseEspessuraMm: number;
    gavetaFolgaLateralMm: number;
    gavetaProfundidadesDisponiveisMm: number[];
    gavetaAlturaModoPadrao: "equal" | "top_small_mid_medium_bottom_large" | "custom";
  };
  viewer: {
    qualidade: "baixa" | "media" | "alta";
    luzIntensidade: number;
    mostrarGrid: boolean;
  };
}

export const settingsDefaults: SettingsSchema = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  geral: {
    locale: "pt-PT",
    theme: "dark",
    autosaveEnabled: true,
    debugMode: false,
  },
  fabrica: {
    larguraChapaPadraoMm: 2750,
    alturaChapaPadraoMm: 1830,
    espessuraPadraoMm: 18,
    toleranciaCorteMm: 0.2,
  },
  precos: {
    margemPercentual: 20,
    multiplicadorBase: 1,
    valorHoraMaquina: 35,
  },
  materiais: {
    categoriaPadraoId: "mdf",
    presetVisualPadraoId: "mdf_branco",
    materialIndustrialPadraoId: "MDF Branco",
  },
  cnc: {
    profundidadeCortePadraoMm: 18,
    offsetFerramentaPadraoMm: 0,
    toleranciaPosicionamentoMm: 0.1,
  },
  nesting: {
    kerfPadraoMm: 3,
    permitirRotacaoGlobal: true,
    prioridadeAproveitamento: "balanceado",
  },
  portas: {
    portaGapVerticalMm: 1,
    portaGapHorizontalMm: 1,
    portaGapDuplaMm: 2,
    portaPosZOffsetMm: 9,
  },
  gavetas: {
    gavetaNormalBaseEspessuraMm: 10,
    gavetaProBaseEspessuraMm: 0,
    gavetaFolgaLateralMm: 7,
    gavetaProfundidadesDisponiveisMm: [250, 300, 350, 400, 450, 500, 550, 600],
    gavetaAlturaModoPadrao: "equal",
  },
  viewer: {
    qualidade: "alta",
    luzIntensidade: 1,
    mostrarGrid: true,
  },
};

type ValidationResult = {
  valid: boolean;
  errors: string[];
  normalized: SettingsSchema;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toNumber = (value: unknown, fallback: number) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;
const normalizeDepths = (value: unknown, fallback: number[]) => {
  if (!Array.isArray(value)) return fallback;
  const parsed = value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
    .sort((a, b) => a - b);
  return parsed.length > 0 ? parsed : fallback;
};

function deepMergeSettings(
  base: SettingsSchema,
  patch: Partial<SettingsSchema> | Record<string, unknown>
): SettingsSchema {
  return {
    ...base,
    ...patch,
    geral: { ...base.geral, ...(isObject(patch.geral) ? patch.geral : {}) },
    fabrica: { ...base.fabrica, ...(isObject(patch.fabrica) ? patch.fabrica : {}) },
    precos: { ...base.precos, ...(isObject(patch.precos) ? patch.precos : {}) },
    materiais: { ...base.materiais, ...(isObject(patch.materiais) ? patch.materiais : {}) },
    cnc: { ...base.cnc, ...(isObject(patch.cnc) ? patch.cnc : {}) },
    nesting: { ...base.nesting, ...(isObject(patch.nesting) ? patch.nesting : {}) },
    portas: { ...base.portas, ...(isObject(patch.portas) ? patch.portas : {}) },
    gavetas: { ...base.gavetas, ...(isObject(patch.gavetas) ? patch.gavetas : {}) },
    viewer: { ...base.viewer, ...(isObject(patch.viewer) ? patch.viewer : {}) },
  };
}

export function validateSettings(input: Partial<SettingsSchema> | SettingsSchema): ValidationResult {
  const merged = deepMergeSettings(settingsDefaults, input);
  const errors: string[] = [];

  const normalized: SettingsSchema = {
    ...merged,
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    geral: {
      locale: typeof merged.geral.locale === "string" && merged.geral.locale.trim() ? merged.geral.locale.trim() : settingsDefaults.geral.locale,
      theme: merged.geral.theme === "light" || merged.geral.theme === "system" ? merged.geral.theme : "dark",
      autosaveEnabled: Boolean(merged.geral.autosaveEnabled),
      debugMode: Boolean(merged.geral.debugMode),
    },
    fabrica: {
      larguraChapaPadraoMm: clamp(toNumber(merged.fabrica.larguraChapaPadraoMm, settingsDefaults.fabrica.larguraChapaPadraoMm), 500, 10000),
      alturaChapaPadraoMm: clamp(toNumber(merged.fabrica.alturaChapaPadraoMm, settingsDefaults.fabrica.alturaChapaPadraoMm), 500, 10000),
      espessuraPadraoMm: clamp(toNumber(merged.fabrica.espessuraPadraoMm, settingsDefaults.fabrica.espessuraPadraoMm), 1, 120),
      toleranciaCorteMm: clamp(toNumber(merged.fabrica.toleranciaCorteMm, settingsDefaults.fabrica.toleranciaCorteMm), 0, 10),
    },
    precos: {
      margemPercentual: clamp(toNumber(merged.precos.margemPercentual, settingsDefaults.precos.margemPercentual), 0, 500),
      multiplicadorBase: clamp(toNumber(merged.precos.multiplicadorBase, settingsDefaults.precos.multiplicadorBase), 0.1, 100),
      valorHoraMaquina: clamp(toNumber(merged.precos.valorHoraMaquina, settingsDefaults.precos.valorHoraMaquina), 0, 10000),
    },
    materiais: {
      categoriaPadraoId: typeof merged.materiais.categoriaPadraoId === "string" && merged.materiais.categoriaPadraoId.trim()
        ? merged.materiais.categoriaPadraoId.trim()
        : settingsDefaults.materiais.categoriaPadraoId,
      presetVisualPadraoId: typeof merged.materiais.presetVisualPadraoId === "string" && merged.materiais.presetVisualPadraoId.trim()
        ? merged.materiais.presetVisualPadraoId.trim()
        : settingsDefaults.materiais.presetVisualPadraoId,
      materialIndustrialPadraoId: typeof merged.materiais.materialIndustrialPadraoId === "string" && merged.materiais.materialIndustrialPadraoId.trim()
        ? merged.materiais.materialIndustrialPadraoId.trim()
        : settingsDefaults.materiais.materialIndustrialPadraoId,
    },
    cnc: {
      profundidadeCortePadraoMm: clamp(toNumber(merged.cnc.profundidadeCortePadraoMm, settingsDefaults.cnc.profundidadeCortePadraoMm), 0, 200),
      offsetFerramentaPadraoMm: clamp(toNumber(merged.cnc.offsetFerramentaPadraoMm, settingsDefaults.cnc.offsetFerramentaPadraoMm), -50, 50),
      toleranciaPosicionamentoMm: clamp(toNumber(merged.cnc.toleranciaPosicionamentoMm, settingsDefaults.cnc.toleranciaPosicionamentoMm), 0, 10),
    },
    nesting: {
      kerfPadraoMm: clamp(toNumber(merged.nesting.kerfPadraoMm, settingsDefaults.nesting.kerfPadraoMm), 0, 20),
      permitirRotacaoGlobal: Boolean(merged.nesting.permitirRotacaoGlobal),
      prioridadeAproveitamento:
        merged.nesting.prioridadeAproveitamento === "area" || merged.nesting.prioridadeAproveitamento === "chapas"
          ? merged.nesting.prioridadeAproveitamento
          : "balanceado",
    },
    portas: {
      portaGapVerticalMm: clamp(toNumber(merged.portas.portaGapVerticalMm, settingsDefaults.portas.portaGapVerticalMm), 0, 20),
      portaGapHorizontalMm: clamp(toNumber(merged.portas.portaGapHorizontalMm, settingsDefaults.portas.portaGapHorizontalMm), 0, 20),
      portaGapDuplaMm: clamp(toNumber(merged.portas.portaGapDuplaMm, settingsDefaults.portas.portaGapDuplaMm), 0, 50),
      portaPosZOffsetMm: clamp(toNumber(merged.portas.portaPosZOffsetMm, settingsDefaults.portas.portaPosZOffsetMm), 0, 50),
    },
    gavetas: {
      gavetaNormalBaseEspessuraMm: clamp(
        toNumber(merged.gavetas.gavetaNormalBaseEspessuraMm, settingsDefaults.gavetas.gavetaNormalBaseEspessuraMm),
        0,
        50
      ),
      gavetaProBaseEspessuraMm: clamp(
        toNumber(merged.gavetas.gavetaProBaseEspessuraMm, settingsDefaults.gavetas.gavetaProBaseEspessuraMm),
        0,
        50
      ),
      gavetaFolgaLateralMm: clamp(
        toNumber(merged.gavetas.gavetaFolgaLateralMm, settingsDefaults.gavetas.gavetaFolgaLateralMm),
        0,
        30
      ),
      gavetaProfundidadesDisponiveisMm: normalizeDepths(
        merged.gavetas.gavetaProfundidadesDisponiveisMm,
        settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm
      ),
      gavetaAlturaModoPadrao:
        merged.gavetas.gavetaAlturaModoPadrao === "top_small_mid_medium_bottom_large" || merged.gavetas.gavetaAlturaModoPadrao === "custom"
          ? merged.gavetas.gavetaAlturaModoPadrao
          : "equal",
    },
    viewer: {
      qualidade: merged.viewer.qualidade === "baixa" || merged.viewer.qualidade === "media" ? merged.viewer.qualidade : "alta",
      luzIntensidade: clamp(toNumber(merged.viewer.luzIntensidade, settingsDefaults.viewer.luzIntensidade), 0, 4),
      mostrarGrid: Boolean(merged.viewer.mostrarGrid),
    },
  };

  if (normalized.fabrica.espessuraPadraoMm > normalized.fabrica.larguraChapaPadraoMm) {
    errors.push("Espessura padrão da fábrica parece inválida para a largura de chapa.");
  }

  return { valid: errors.length === 0, errors, normalized };
}

export function migrateSettings(raw: unknown): SettingsSchema {
  if (!isObject(raw)) return settingsDefaults;
  const patched = deepMergeSettings(settingsDefaults, raw);
  // Reservado para futuras versões de schema.
  return validateSettings({ ...patched, schemaVersion: SETTINGS_SCHEMA_VERSION }).normalized;
}

export function getSettings(): SettingsSchema {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return settingsDefaults;
    const parsed = JSON.parse(raw) as unknown;
    return migrateSettings(parsed);
  } catch {
    return settingsDefaults;
  }
}

export function saveSettings(settings: Partial<SettingsSchema> | SettingsSchema): {
  success: boolean;
  message: string;
  settings: SettingsSchema;
  errors: string[];
} {
  const result = validateSettings(settings);
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(result.normalized));
    return {
      success: result.valid,
      message: result.valid
        ? "Configurações guardadas com sucesso."
        : "Configurações guardadas com ajustes de validação.",
      settings: result.normalized,
      errors: result.errors,
    };
  } catch {
    return {
      success: false,
      message: "Falha ao guardar configurações no armazenamento local.",
      settings: result.normalized,
      errors: ["Erro de persistência localStorage."],
    };
  }
}
