/**
 * Settings Engine central.
 * Estrutura base de configurações globais (persistência + validação + migração leve).
 */

import { PANEL_DEFAULTS } from "../panel/panelConstants";

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
    sheetWidthMm: number;
    sheetHeightMm: number;
    sheetThicknessMm: number;
    sheetName: string;
  };
  cnc: {
    profundidadeCortePadraoMm: number;
    offsetFerramentaPadraoMm: number;
    toleranciaPosicionamentoMm: number;
    /** Diâmetro da fresa para compensação geométrica no TCN (contorno já compensado no CAM; 0 = usar Kerf padrão ou 12 mm). */
    diametroFresaContornoMm: number;
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
  ferragens: {
    cavilha: {
      diametro: number;
      profundidade: number;
      distanciaBorda: number;
      ativo: boolean;
    };
    parafuso: {
      diametro: number;
      comprimento: number;
      ativo: boolean;
    };
    corredica: {
      tipo: string;
      folga: number;
      ativo: boolean;
    };
  };
  viewer: {
    qualidade: "baixa" | "media" | "alta";
    luzIntensidade: number;
    mostrarGrid: boolean;
  };
  furação: {
    /** Distâncias de furação parafuso (mm). Aplicadas globalmente a todos os projetos. */
    parafuso: {
      /** Distância da frente ao eixo do parafuso (mm). Padrão industrial 90. */
      frontDistance: number;
      /** Distância do fundo ao eixo do parafuso (mm). Padrão industrial 90. */
      backDistance: number;
      /** Offset da borda (linha de furação), mm. */
      offsetDaBorda: number;
      /** Distância do centro do furo à borda lateral da peça (mm). Padrão industrial 9.5. */
      sideOffset: number;
    };
    /** Distâncias de furação cavilha (mm). Aplicadas globalmente a todos os projetos. */
    cavilha: {
      /** Distância da frente ao eixo da cavilha (mm). Padrão industrial 60. */
      frontDistance: number;
      /** Distância do fundo ao eixo da cavilha (mm). Padrão industrial 60. */
      backDistance: number;
      /** Distância do centro do furo à borda lateral da peça (mm). Padrão industrial 9.5. */
      sideOffset: number;
    };
    prateleira: {
      margemTop: number;
      margemBottom: number;
      minFuros: number;
      maxFuros: number;
      espacamentoVertical: number;
      /** Offset horizontal dos furos (linha frente e fundo), mm. */
      distanciaDaBorda: number;
    };
    dobradica: {
      distanciaCentroDaBorda: number;
      /** Distância da dobradiça ao topo (mm). */
      distanciaDobradiçaTopo: number;
      /** Distância da dobradiça ao fundo (mm). */
      distanciaDobradiçaFundo: number;
      /** Número de dobradiças por porta. */
      numeroPorPorta: number;
      /** Se true, distribui Y automaticamente (distTopo/distFundo/proporcional); se false, usa offsetsVerticaisMm quando definido. */
      distribuicaoAutomatica: boolean;
    };
    /** Regras de fixação da dobradiça na lateral: 2 furos calço + 1 parafuso união. */
    dobradicaFixacao: {
      /** Distância da borda ao eixo dos 2 furos do calço (mm). */
      distanciaDaBordaCalco: number;
      /** Distância da borda ao eixo do furo de parafuso de união (mm). */
      distanciaDaBordaParafusoUniao: number;
      /** Distância entre os 2 furos do calço (mm). */
      distanciaEntreFurosCalco: number;
      profundidadeFuro: number;
      diametro: number;
      diametroParafusoUniao: number;
      profundidadeParafusoUniao: number;
    };
  };
  etiquetasQr: {
    /** Ativar QR com logo integrado */
    logoAtivado: boolean;
    /** Data URL da imagem do logo (PNG com fundo transparente) */
    logoDataUrl?: string;
    /** Tamanho do logo em percentual (10-30%) */
    logoTamanhoPorcento: number;
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
    sheetWidthMm: PANEL_DEFAULTS.largura_mm,
    sheetHeightMm: PANEL_DEFAULTS.altura_mm,
    sheetThicknessMm: PANEL_DEFAULTS.espessura_mm,
    sheetName: "MDF Branco 19mm",
  },
  cnc: {
    profundidadeCortePadraoMm: 18,
    offsetFerramentaPadraoMm: 0,
    toleranciaPosicionamentoMm: 0.1,
    diametroFresaContornoMm: 0,
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
  ferragens: {
    cavilha: {
      diametro: 8,
      profundidade: 30,
      distanciaBorda: 37,
      ativo: true,
    },
    parafuso: {
      diametro: 4,
      comprimento: 30,
      ativo: true,
    },
    corredica: {
      tipo: "telescopica",
      folga: 7,
      ativo: true,
    },
  },
  viewer: {
    qualidade: "alta",
    luzIntensidade: 1,
    mostrarGrid: true,
  },
  furação: {
    parafuso: {
      frontDistance: 90,
      backDistance: 90,
      offsetDaBorda: 9,
      sideOffset: 9.5,
    },
    cavilha: {
      frontDistance: 60,
      backDistance: 60,
      sideOffset: 9.5,
    },
    prateleira: {
      margemTop: 200,
      margemBottom: 200,
      minFuros: 6,
      maxFuros: 40,
      espacamentoVertical: 32,
      distanciaDaBorda: 60,
    },
    dobradica: {
      distanciaCentroDaBorda: 22.5,
      distanciaDobradiçaTopo: 100,
      distanciaDobradiçaFundo: 100,
      numeroPorPorta: 2,
      distribuicaoAutomatica: true,
    },
    dobradicaFixacao: {
      distanciaDaBordaCalco: 37,
      distanciaDaBordaParafusoUniao: 53,
      distanciaEntreFurosCalco: 32,
      profundidadeFuro: 12,
      diametro: 5,
      diametroParafusoUniao: 5,
      /** Terceiro furo: apenas marcation (0.5 mm). Não estrutural. */
      profundidadeParafusoUniao: 0.5,
    },
  },
  etiquetasQr: {
    logoAtivado: false,
    logoDataUrl: undefined,
    logoTamanhoPorcento: 20,
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
    ferragens: {
      ...base.ferragens,
      ...(isObject(patch.ferragens) ? patch.ferragens : {}),
      cavilha: {
        ...base.ferragens.cavilha,
        ...(isObject((patch.ferragens as Record<string, unknown> | undefined)?.cavilha)
          ? (patch.ferragens as Record<string, unknown>).cavilha as Record<string, unknown>
          : {}),
      },
      parafuso: {
        ...base.ferragens.parafuso,
        ...(isObject((patch.ferragens as Record<string, unknown> | undefined)?.parafuso)
          ? (patch.ferragens as Record<string, unknown>).parafuso as Record<string, unknown>
          : {}),
      },
      corredica: {
        ...base.ferragens.corredica,
        ...(isObject((patch.ferragens as Record<string, unknown> | undefined)?.corredica)
          ? (patch.ferragens as Record<string, unknown>).corredica as Record<string, unknown>
          : {}),
      },
    },
    viewer: { ...base.viewer, ...(isObject(patch.viewer) ? patch.viewer : {}) },
    furação: {
      ...base.furação,
      ...(isObject(patch.furação) ? patch.furação : {}),
      parafuso: {
        ...base.furação.parafuso,
        ...(isObject((patch.furação as Record<string, unknown> | undefined)?.parafuso)
          ? (patch.furação as Record<string, unknown>).parafuso as Record<string, unknown>
          : {}),
      },
      cavilha: {
        ...base.furação.cavilha,
        ...(isObject((patch.furação as Record<string, unknown> | undefined)?.cavilha)
          ? (patch.furação as Record<string, unknown>).cavilha as Record<string, unknown>
          : {}),
      },
      prateleira: {
        ...base.furação.prateleira,
        ...(isObject((patch.furação as Record<string, unknown> | undefined)?.prateleira)
          ? (patch.furação as Record<string, unknown>).prateleira as Record<string, unknown>
          : {}),
      },
      dobradica: {
        ...base.furação.dobradica,
        ...(isObject((patch.furação as Record<string, unknown> | undefined)?.dobradica)
          ? (patch.furação as Record<string, unknown>).dobradica as Record<string, unknown>
          : {}),
      },
      dobradicaFixacao: {
        ...base.furação.dobradicaFixacao,
        ...(isObject((patch.furação as Record<string, unknown> | undefined)?.dobradicaFixacao)
          ? (patch.furação as Record<string, unknown>).dobradicaFixacao as Record<string, unknown>
          : {}),
      },
    },
    etiquetasQr: { ...base.etiquetasQr, ...(isObject(patch.etiquetasQr) ? patch.etiquetasQr : {}) },
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
      sheetWidthMm: clamp(
        toNumber(merged.materiais.sheetWidthMm, settingsDefaults.materiais.sheetWidthMm),
        500,
        10000
      ),
      sheetHeightMm: clamp(
        toNumber(merged.materiais.sheetHeightMm, settingsDefaults.materiais.sheetHeightMm),
        500,
        10000
      ),
      sheetThicknessMm: clamp(
        toNumber(merged.materiais.sheetThicknessMm, settingsDefaults.materiais.sheetThicknessMm),
        1,
        120
      ),
      sheetName:
        typeof merged.materiais.sheetName === "string" && merged.materiais.sheetName.trim()
          ? merged.materiais.sheetName.trim()
          : settingsDefaults.materiais.sheetName,
    },
    cnc: {
      profundidadeCortePadraoMm: clamp(toNumber(merged.cnc.profundidadeCortePadraoMm, settingsDefaults.cnc.profundidadeCortePadraoMm), 0, 200),
      offsetFerramentaPadraoMm: clamp(toNumber(merged.cnc.offsetFerramentaPadraoMm, settingsDefaults.cnc.offsetFerramentaPadraoMm), -50, 50),
      toleranciaPosicionamentoMm: clamp(toNumber(merged.cnc.toleranciaPosicionamentoMm, settingsDefaults.cnc.toleranciaPosicionamentoMm), 0, 10),
      diametroFresaContornoMm: clamp(toNumber(merged.cnc.diametroFresaContornoMm, settingsDefaults.cnc.diametroFresaContornoMm), 0, 30),
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
    ferragens: {
      cavilha: {
        diametro: clamp(
          toNumber(merged.ferragens.cavilha.diametro, settingsDefaults.ferragens.cavilha.diametro),
          1,
          50
        ),
        profundidade: clamp(
          toNumber(merged.ferragens.cavilha.profundidade, settingsDefaults.ferragens.cavilha.profundidade),
          1,
          100
        ),
        distanciaBorda: clamp(
          toNumber(merged.ferragens.cavilha.distanciaBorda, settingsDefaults.ferragens.cavilha.distanciaBorda),
          0,
          200
        ),
        ativo: Boolean(merged.ferragens.cavilha.ativo),
      },
      parafuso: {
        diametro: clamp(
          toNumber(merged.ferragens.parafuso.diametro, settingsDefaults.ferragens.parafuso.diametro),
          1,
          20
        ),
        comprimento: clamp(
          toNumber(merged.ferragens.parafuso.comprimento, settingsDefaults.ferragens.parafuso.comprimento),
          1,
          200
        ),
        ativo: Boolean(merged.ferragens.parafuso.ativo),
      },
      corredica: {
        tipo:
          typeof merged.ferragens.corredica.tipo === "string" && merged.ferragens.corredica.tipo.trim()
            ? merged.ferragens.corredica.tipo.trim()
            : settingsDefaults.ferragens.corredica.tipo,
        folga: clamp(
          toNumber(merged.ferragens.corredica.folga, settingsDefaults.ferragens.corredica.folga),
          0,
          50
        ),
        ativo: Boolean(merged.ferragens.corredica.ativo),
      },
    },
    viewer: {
      qualidade: merged.viewer.qualidade === "baixa" || merged.viewer.qualidade === "media" ? merged.viewer.qualidade : "alta",
      luzIntensidade: clamp(toNumber(merged.viewer.luzIntensidade, settingsDefaults.viewer.luzIntensidade), 0, 4),
      mostrarGrid: Boolean(merged.viewer.mostrarGrid),
    },
    furação: {
      parafuso: {
        frontDistance: clamp(
          toNumber(
            merged.furação?.parafuso?.frontDistance ??
              (merged.furação?.parafuso as Record<string, unknown> | undefined)?.distanciaFrenteParafuso,
            settingsDefaults.furação.parafuso.frontDistance
          ),
          5,
          500
        ),
        backDistance: clamp(
          toNumber(
            merged.furação?.parafuso?.backDistance ??
              (merged.furação?.parafuso as Record<string, unknown> | undefined)?.distanciaFrenteParafuso,
            settingsDefaults.furação.parafuso.backDistance
          ),
          5,
          500
        ),
        offsetDaBorda: clamp(
          toNumber(merged.furação?.parafuso?.offsetDaBorda, settingsDefaults.furação.parafuso.offsetDaBorda),
          3,
          50
        ),
        sideOffset: clamp(
          toNumber(merged.furação?.parafuso?.sideOffset, settingsDefaults.furação.parafuso.sideOffset),
          3,
          50
        ),
      },
      cavilha: {
        frontDistance: clamp(
          toNumber(
            merged.furação?.cavilha?.frontDistance ??
              (merged.furação?.parafuso as Record<string, unknown> | undefined)?.distanciaFrenteCavilha,
            settingsDefaults.furação.cavilha.frontDistance
          ),
          5,
          500
        ),
        backDistance: clamp(
          toNumber(
            merged.furação?.cavilha?.backDistance ??
              (merged.furação?.parafuso as Record<string, unknown> | undefined)?.distanciaFrenteCavilha,
            settingsDefaults.furação.cavilha.backDistance
          ),
          5,
          500
        ),
        sideOffset: clamp(
          toNumber(merged.furação?.cavilha?.sideOffset, settingsDefaults.furação.cavilha.sideOffset),
          3,
          50
        ),
      },
      prateleira: {
        margemTop: clamp(toNumber(merged.furação?.prateleira?.margemTop, settingsDefaults.furação.prateleira.margemTop), 0, 500),
        margemBottom: clamp(toNumber(merged.furação?.prateleira?.margemBottom, settingsDefaults.furação.prateleira.margemBottom), 0, 500),
        minFuros: clamp(toNumber(merged.furação?.prateleira?.minFuros, settingsDefaults.furação.prateleira.minFuros), 2, 100),
        maxFuros: clamp(toNumber(merged.furação?.prateleira?.maxFuros, settingsDefaults.furação.prateleira.maxFuros), 2, 100),
        espacamentoVertical: clamp(
          toNumber(merged.furação?.prateleira?.espacamentoVertical, settingsDefaults.furação.prateleira.espacamentoVertical),
          16,
          64
        ),
        distanciaDaBorda: clamp(
          toNumber(merged.furação?.prateleira?.distanciaDaBorda, settingsDefaults.furação.prateleira.distanciaDaBorda),
          5,
          80
        ),
      },
      dobradica: {
        distanciaCentroDaBorda: clamp(
          toNumber(merged.furação?.dobradica?.distanciaCentroDaBorda, settingsDefaults.furação.dobradica.distanciaCentroDaBorda),
          15,
          35
        ),
        distanciaDobradiçaTopo: clamp(
          toNumber(merged.furação?.dobradica?.distanciaDobradiçaTopo, settingsDefaults.furação.dobradica.distanciaDobradiçaTopo),
          20,
          300
        ),
        distanciaDobradiçaFundo: clamp(
          toNumber(merged.furação?.dobradica?.distanciaDobradiçaFundo, settingsDefaults.furação.dobradica.distanciaDobradiçaFundo),
          20,
          300
        ),
        numeroPorPorta: clamp(
          toNumber(merged.furação?.dobradica?.numeroPorPorta, settingsDefaults.furação.dobradica.numeroPorPorta),
          1,
          6
        ),
        distribuicaoAutomatica: Boolean(merged.furação?.dobradica?.distribuicaoAutomatica ?? settingsDefaults.furação.dobradica.distribuicaoAutomatica),
      },
      dobradicaFixacao: {
        distanciaDaBordaCalco: clamp(
          toNumber(
            (merged.furação?.dobradicaFixacao as Record<string, unknown> | undefined)?.distanciaDaBordaCalco ??
              (merged.furação?.dobradicaFixacao as Record<string, unknown> | undefined)?.distanciaDaBorda,
            settingsDefaults.furação.dobradicaFixacao.distanciaDaBordaCalco
          ),
          5,
          80
        ),
        distanciaDaBordaParafusoUniao: clamp(
          toNumber(merged.furação?.dobradicaFixacao?.distanciaDaBordaParafusoUniao, settingsDefaults.furação.dobradicaFixacao.distanciaDaBordaParafusoUniao),
          10,
          100
        ),
        distanciaEntreFurosCalco: clamp(
          toNumber(
            (merged.furação?.dobradicaFixacao as Record<string, unknown> | undefined)?.distanciaEntreFurosCalco ??
              (merged.furação?.dobradicaFixacao as Record<string, unknown> | undefined)?.distanciaEntreFuros,
            settingsDefaults.furação.dobradicaFixacao.distanciaEntreFurosCalco
          ),
          10,
          80
        ),
        profundidadeFuro: clamp(
          toNumber(merged.furação?.dobradicaFixacao?.profundidadeFuro, settingsDefaults.furação.dobradicaFixacao.profundidadeFuro),
          5,
          25
        ),
        diametro: clamp(toNumber(merged.furação?.dobradicaFixacao?.diametro, settingsDefaults.furação.dobradicaFixacao.diametro), 3, 10),
        diametroParafusoUniao: clamp(toNumber(merged.furação?.dobradicaFixacao?.diametroParafusoUniao, settingsDefaults.furação.dobradicaFixacao.diametroParafusoUniao), 3, 10),
        profundidadeParafusoUniao: clamp(toNumber(merged.furação?.dobradicaFixacao?.profundidadeParafusoUniao, settingsDefaults.furação.dobradicaFixacao.profundidadeParafusoUniao), 0.5, 25),
      },
    },
    etiquetasQr: {
      logoAtivado: Boolean(merged.etiquetasQr?.logoAtivado ?? settingsDefaults.etiquetasQr.logoAtivado),
      logoDataUrl: typeof merged.etiquetasQr?.logoDataUrl === "string" ? merged.etiquetasQr.logoDataUrl : undefined,
      logoTamanhoPorcento: clamp(
        toNumber(merged.etiquetasQr?.logoTamanhoPorcento, settingsDefaults.etiquetasQr.logoTamanhoPorcento),
        10,
        30
      ),
    },
  };

  if (normalized.materiais.sheetThicknessMm > normalized.materiais.sheetWidthMm) {
    errors.push("Espessura padrão da fábrica parece inválida para a largura de chapa.");
  }

  return { valid: errors.length === 0, errors, normalized };
}

export function migrateSettings(raw: unknown): SettingsSchema {
  if (!isObject(raw)) return settingsDefaults;
  const rawObj = raw as Record<string, unknown>;
  const rawFabrica = isObject(rawObj.fabrica) ? (rawObj.fabrica as Record<string, unknown>) : {};
  const rawMateriais = isObject(rawObj.materiais) ? (rawObj.materiais as Record<string, unknown>) : {};
  const migratedMateriais: Record<string, unknown> = { ...rawMateriais };
  if (migratedMateriais.sheetWidthMm == null && rawFabrica.larguraChapaPadraoMm != null) {
    migratedMateriais.sheetWidthMm = rawFabrica.larguraChapaPadraoMm;
  }
  if (migratedMateriais.sheetHeightMm == null && rawFabrica.alturaChapaPadraoMm != null) {
    migratedMateriais.sheetHeightMm = rawFabrica.alturaChapaPadraoMm;
  }
  if (migratedMateriais.sheetThicknessMm == null && rawFabrica.espessuraPadraoMm != null) {
    migratedMateriais.sheetThicknessMm = rawFabrica.espessuraPadraoMm;
  }
  const patched = deepMergeSettings(settingsDefaults, { ...rawObj, materiais: migratedMateriais });
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

/** Configuração global de furação (parafuso/cavilha). Usada pelo drillingAdapter e pela UI; aplicada a todos os projetos. */
export function getDrillingConfig(): SettingsSchema["furação"] {
  return getSettings().furação;
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
