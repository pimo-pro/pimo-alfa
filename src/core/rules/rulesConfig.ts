/**
 * Configuração central de todas as regras dinâmicas do projeto.
 * Controla: portas, prateleiras, pés, divisores, furos, madeira/estrutura.
 * Editável via Admin; afeta todo o projeto automaticamente.
 */

export type PortaRange = {
  /** Altura mínima da porta (mm). */
  min: number;
  /** Altura máxima da porta (mm). */
  max: number;
  /** Número de dobradiças para este range. */
  dobradicas: number;
};

export type PeRange = {
  /** Largura mínima da caixa (cm). */
  min: number;
  /** Largura máxima da caixa (cm). */
  max: number;
  /** Número de pés para este range. */
  pes: number;
};

export type RulesConfig = {
  portas: {
    /** Ranges de altura → número de dobradiças. */
    ranges: PortaRange[];
  };
  prateleiras: {
    /** Suportes por prateleira (4 = 1 em cada canto). */
    suportesPorPrateleira: number;
  };
  pes: {
    /** Ranges de largura → número de pés. */
    ranges: PeRange[];
  };
  altura: {
    /** Altura mínima para permitir divisor transversal (cm). */
    divisorTransversalMin: number;
  };
  largura: {
    /** Largura mínima para permitir divisor longitudinal (cm). */
    divisorLongitudinalMin: number;
  };
  furos: {
    /** Margem do topo para primeira fila de furos (mm). */
    margemTopo: number;
    /** Margem da base para última fila de furos (mm). */
    margemBase: number;
    /** Recuo da borda lateral (mm). */
    recuoBorda: number;
    /** Distância vertical entre furos (mm). */
    distanciaEntreFuros: number;
    /** Profundidade dos furos (mm). */
    profundidadeFuro: number;
    /** Diâmetro dos furos (mm). */
    diametroFuro: number;
    /** Configuração técnica completa por tipo de furação. */
    tecnicos: {
      cavilha: {
        enabled: boolean;
        distanciaFrente: number;
        distanciaFundo: number;
        distanciaLateral: number;
        distanciaTopo: number;
        distanciaBase: number;
        offsetLateral: number;
        /** Linha de furação: offset da borda esquerda/direita (meio espessura ≈ 9mm). */
        offsetDaBorda: number;
        /** Distância do centro do furo à borda lateral (mm). Padrão 9.5. */
        sideOffset: number;
        aplicarEm: {
          cima: boolean;
          fundo: boolean;
          lateralEsquerda: boolean;
          lateralDireita: boolean;
        };
        diametro: number;
        profundidade: number;
      };
      parafuso: {
        enabled: boolean;
        /** Distância da frente até o parafuso (mm). */
        distanciaFrente: number;
        /** Distância do fundo até o parafuso (mm). */
        distanciaFundo: number;
        /** Linha de furação: offset da borda (default 9mm = meio espessura). */
        offsetDaBorda: number;
        /** Distância do centro do furo à borda lateral (mm). Padrão 9.5. */
        sideOffset: number;
        distanciaLateral: number;
        offsetDaCavilha: number;
        aplicarEm: {
          cima: boolean;
          fundo: boolean;
        };
        diametro: number;
        profundidade: number;
        profundidadeIgualEspessura: boolean;
      };
      dobradica: {
        enabled: boolean;
        /** Distância da borda da porta ao centro do caneco (mm). Padrão 22.5. */
        distanciaCentroDaBorda: number;
        distanciaBordaLateral: number;
        /** Distância da dobradiça ao topo (mm). */
        distanciaDobradiçaTopo: number;
        /** Distância da dobradiça ao fundo (mm). */
        distanciaDobradiçaFundo: number;
        offsetSuperior: number;
        offsetInferior: number;
        numeroPorPorta: number;
        /** Se true, posições Y calculadas por distTopo/distFundo/proporcional; se false, usa offsetsVerticaisMm. */
        distribuicaoAutomatica: boolean;
        offsetsVerticaisMm: number[];
        /** Diâmetro do furo do caneco (mm). Padrão 35. */
        diametro: number;
        /** Profundidade do furo do caneco (mm). Padrão 13. */
        profundidade: number;
        /** Distância da borda da porta ao CENTRO de cada furo de fixação (mm). Padrão 28. */
        distanciaFurosFixacaoBorda: number;
        /** Distância entre os CENTROS dos dois furos de fixação na porta (mm). Padrão 52. */
        distanciaEntreFurosFixacao: number;
        /** Diâmetro dos furos de fixação na porta (mm). Padrão 10. */
        diametroFurosFixacao: number;
        /** Profundidade dos furos de fixação na porta (mm). Padrão 12. */
        profundidadeFurosFixacao: number;
      };
      corredica: {
        enabled: boolean;
        offsetFrente: number;
        offsetFundo: number;
        alturaRelativaFundo: number;
        offsetVerticalAdicional: number;
        diametro: number;
        profundidade: number;
      };
      prateleira: {
        enabled: boolean;
        margemTopo: number;
        margemBase: number;
        /** Distância da borda frontal à linha de furos (mm). */
        margemFrente: number;
        /** Distância da borda traseira à linha de furos (mm). */
        margemFundo: number;
        /** Offset horizontal dos furos (linha frente e fundo). */
        recuoBorda: number;
        distanciaDaBorda: number;
        espacamento: number;
        espacamentoVertical: number;
        numeroFurosPorColuna: number;
        minFurosPorColuna: number;
        maxFurosPorColuna: number;
        diametro: number;
        profundidade: number;
      };
      /** Furos de fixação da dobradiça na lateral: 2 do calço + 1 parafuso de união. */
      dobradica_fixacao: {
        enabled: boolean;
        /** Distância da borda interna ao eixo dos 2 furos do calço (mm). */
        distanciaDaBordaCalco: number;
        /** Distância da borda interna ao eixo do furo de parafuso de união (mm). */
        distanciaDaBordaParafusoUniao: number;
        /** Distância entre os 2 furos do calço (mm). */
        distanciaEntreFurosCalco: number;
        diametro: number;
        profundidadeFuro: number;
        /** Diâmetro do furo de parafuso de união (mm). */
        diametroParafusoUniao: number;
        /** Profundidade do furo de parafuso de união (mm). */
        profundidadeParafusoUniao: number;
        /** @deprecated Use distanciaDaBordaCalco */
        distanciaDaBorda?: number;
        /** @deprecated Use distanciaEntreFurosCalco */
        distanciaEntreFuros?: number;
      };
      /** Furos superiores nas próprias prateleiras (top drilling). */
      shelfTop: {
        enabled: boolean;
        /** Distância da borda frontal (mm). */
        distanciaFrente: number;
        /** Distância da borda traseira (mm). */
        distanciaFundo: number;
        /** Distância da borda esquerda (mm). */
        distanciaEsquerda: number;
        /** Distância da borda direita (mm). */
        distanciaDireita: number;
        /** Diâmetro do furo (mm). */
        diametro: number;
        /** Profundidade do furo (mm, negativo no TCN). */
        profundidade: number;
      };
    };
  };
  madeira: {
    /** Espessura fixa da COSTA (mm). */
    espessuraCosta: number;
    /** Se true, altura lateral = altura_total - (espessura_cima + espessura_fundo). */
    calcularAlturaLaterais: boolean;
    /** Se true, profundidade das peças não muda com dimensões (futuro uso). */
    profundidadeFixa: boolean;
  };
  qrcode: {
    tamanhoQr: number;
    tamanhoTexto: number;
    mostrarTextoAbaixoQr: boolean;
    destacarNumeroPeca: boolean;
    numeroDigitosPeca: 2 | 3;
    reiniciarContagemEm99: boolean;
  };
  etiqueta: {
    larguraMm: number;
    alturaMm: number;
    bordaPx: number;
    margemInternaMm: number;
    tamanhoQr: number;
    tamanhoTexto: number;
    mostrarLogo: boolean;
    mostrarLogoEmpresa: boolean;
    logoDataUrl?: string;
    posicaoLogo: "esquerda" | "direita" | "acima";
    mostrarMaterial: boolean;
    mostrarDimensoes: boolean;
    mostrarReferencia: boolean;
  };
};

/** Regras padrão do projeto (defaults; carregadas ao iniciar ou ao resetar). */
export const defaultRulesConfig: RulesConfig = {
  portas: {
    ranges: [
      { min: 100, max: 900, dobradicas: 2 },
      { min: 901, max: 1600, dobradicas: 3 },
      { min: 1601, max: 2000, dobradicas: 4 },
      { min: 2001, max: 2400, dobradicas: 5 },
      { min: 2401, max: 2600, dobradicas: 6 },
      { min: 2601, max: 2800, dobradicas: 7 },
    ],
  },
  prateleiras: {
    suportesPorPrateleira: 4,
  },
  pes: {
    ranges: [
      { min: 10, max: 90, pes: 4 },
      { min: 91, max: 150, pes: 6 },
      { min: 151, max: 200, pes: 8 },
    ],
  },
  altura: {
    divisorTransversalMin: 150,
  },
  largura: {
    divisorLongitudinalMin: 150,
  },
  furos: {
    margemTopo: 200,
    margemBase: 200,
    recuoBorda: 50,
    distanciaEntreFuros: 50,
    profundidadeFuro: 10,
    diametroFuro: 5,
    tecnicos: {
      cavilha: {
        enabled: true,
        distanciaFrente: 60,
        distanciaFundo: 60,
        distanciaLateral: 60,
        distanciaTopo: 60,
        distanciaBase: 60,
        offsetLateral: 0,
        offsetDaBorda: 9,
        sideOffset: 9.5,
        aplicarEm: {
          cima: true,
          fundo: true,
          lateralEsquerda: true,
          lateralDireita: true,
        },
        diametro: 10,
        profundidade: 10,
      },
      parafuso: {
        enabled: true,
        distanciaFrente: 40,
        distanciaFundo: 40,
        offsetDaBorda: 9,
        sideOffset: 9.5,
        distanciaLateral: 60,
        offsetDaCavilha: 20,
        aplicarEm: {
          cima: true,
          fundo: true,
        },
        diametro: 4,
        profundidade: 19,
        profundidadeIgualEspessura: true,
      },
      dobradica: {
        enabled: true,
        distanciaCentroDaBorda: 22.5,
        distanciaBordaLateral: 22.5,
        distanciaDobradiçaTopo: 100,
        distanciaDobradiçaFundo: 100,
        offsetSuperior: 100,
        offsetInferior: 100,
        numeroPorPorta: 2,
        distribuicaoAutomatica: true,
        offsetsVerticaisMm: [],
        diametro: 35,
        profundidade: 13,
        distanciaFurosFixacaoBorda: 28,
        distanciaEntreFurosFixacao: 52,
        diametroFurosFixacao: 10,
        profundidadeFurosFixacao: 12,
      },
      corredica: {
        enabled: true,
        offsetFrente: 37,
        offsetFundo: 37,
        alturaRelativaFundo: 37,
        offsetVerticalAdicional: 0,
        diametro: 5,
        profundidade: 10,
      },
      prateleira: {
        enabled: true,
        margemTopo: 200,
        margemBase: 200,
        margemFrente: 60,
        margemFundo: 60,
        recuoBorda: 37,
        distanciaDaBorda: 60,
        espacamento: 32,
        espacamentoVertical: 32,
        numeroFurosPorColuna: 0,
        minFurosPorColuna: 6,
        maxFurosPorColuna: 40,
        diametro: 5,
        profundidade: 13,
      },
      dobradica_fixacao: {
        enabled: true,
        distanciaDaBordaCalco: 37,
        distanciaDaBordaParafusoUniao: 53,
        distanciaEntreFurosCalco: 32,
        diametro: 5,
        profundidadeFuro: 12,
        diametroParafusoUniao: 5,
        /** Terceiro furo: apenas marcation (0.5 mm). Não estrutural. */
        profundidadeParafusoUniao: 0.5,
      },
      shelfTop: {
        enabled: false,
        distanciaFrente: 37,
        distanciaFundo: 37,
        distanciaEsquerda: 37,
        distanciaDireita: 37,
        diametro: 5,
        profundidade: 13,
      },
    },
  },
  madeira: {
    espessuraCosta: 10,
    calcularAlturaLaterais: true,
    profundidadeFixa: true,
  },
  qrcode: {
    tamanhoQr: 18,
    tamanhoTexto: 8,
    mostrarTextoAbaixoQr: true,
    destacarNumeroPeca: true,
    numeroDigitosPeca: 3,
    reiniciarContagemEm99: true,
  },
  etiqueta: {
    larguraMm: 100,
    alturaMm: 50,
    bordaPx: 1,
    margemInternaMm: 2,
    tamanhoQr: 28,
    tamanhoTexto: 8,
    mostrarLogo: false,
    mostrarLogoEmpresa: false,
    logoDataUrl: "",
    posicaoLogo: "esquerda",
    mostrarMaterial: true,
    mostrarDimensoes: true,
    mostrarReferencia: true,
  },
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const LEGACY_PORTA_RANGES_CM_V1: Array<{ min: number; max: number; dobradicas: number }> = [
  { min: 10, max: 50, dobradicas: 2 },
  { min: 51, max: 100, dobradicas: 3 },
  { min: 101, max: 150, dobradicas: 3 },
  { min: 151, max: 200, dobradicas: 4 },
];

function looksLikeCmRanges(ranges: Array<{ min: number; max: number; dobradicas: number }>): boolean {
  // Heurística: ranges em cm tipicamente têm max <= 300
  const maxVal = Math.max(...ranges.map((r) => Number(r.max) || 0));
  return maxVal > 0 && maxVal <= 400;
}

function isSamePortaRanges(
  a: Array<{ min: number; max: number; dobradicas: number }>,
  b: Array<{ min: number; max: number; dobradicas: number }>
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (!x || !y) return false;
    if (Number(x.min) !== Number(y.min)) return false;
    if (Number(x.max) !== Number(y.max)) return false;
    if (Number(x.dobradicas) !== Number(y.dobradicas)) return false;
  }
  return true;
}

function normalizePortaRanges(srcPortas: unknown, defaults: RulesConfig["portas"]): RulesConfig["portas"]["ranges"] {
  const portasObj = isObject(srcPortas) ? (srcPortas as Record<string, unknown>) : {};
  const rangesRaw = portasObj.ranges;
  if (!Array.isArray(rangesRaw)) return defaults.ranges;

  const ranges = rangesRaw
    .map((r) => (isObject(r) ? r : {}))
    .map((r) => ({
      min: Number((r as Record<string, unknown>).min),
      max: Number((r as Record<string, unknown>).max),
      dobradicas: Number((r as Record<string, unknown>).dobradicas),
    }))
    .filter((r) => Number.isFinite(r.min) && Number.isFinite(r.max) && Number.isFinite(r.dobradicas));

  // Migração: perfis antigos podem ter a tabela legacy hard-coded em CM.
  // Se bater exatamente, ou se parecer cm (max <= 400), converte para mm.
  if (isSamePortaRanges(ranges, LEGACY_PORTA_RANGES_CM_V1)) {
    return defaults.ranges;
  }
  if (looksLikeCmRanges(ranges)) {
    return ranges.map((r) => ({ ...r, min: Math.round(r.min * 10), max: Math.round(r.max * 10) })) as RulesConfig["portas"]["ranges"];
  }
  // Se já estiver em mm, mantém.
  // Se bater exatamente na tabela antiga já em mm (caso raro), também normaliza para defaults atuais.
  if (isSamePortaRanges(ranges, defaults.ranges)) {
    return defaults.ranges;
  }
  return ranges as RulesConfig["portas"]["ranges"];
}

/**
 * Normaliza regras vindas de versões antigas, garantindo estrutura completa.
 * Evita crashes em telas que acessam chaves profundas (ex.: furos.tecnicos.cavilha).
 */
export function normalizeRulesConfig(input: unknown): RulesConfig {
  if (!isObject(input)) return JSON.parse(JSON.stringify(defaultRulesConfig)) as RulesConfig;

  const src = input as Record<string, unknown>;
  const defaults = defaultRulesConfig;
  const asObject = (value: unknown): Record<string, unknown> => (isObject(value) ? value : {});
  const furosSrc = asObject(src.furos);
  const tecnicosSrc = asObject(furosSrc.tecnicos);

  const base = {
    ...defaults,
    ...src,
  } as RulesConfig;

  return {
    ...base,
    portas: {
      ...defaults.portas,
      ...(isObject(src.portas) ? src.portas : {}),
      ranges: normalizePortaRanges(src.portas, defaults.portas),
    },
    prateleiras: {
      ...defaults.prateleiras,
      ...(isObject(src.prateleiras) ? src.prateleiras : {}),
    },
    pes: {
      ...defaults.pes,
      ...(isObject(src.pes) ? src.pes : {}),
    },
    altura: {
      ...defaults.altura,
      ...(isObject(src.altura) ? src.altura : {}),
    },
    largura: {
      ...defaults.largura,
      ...(isObject(src.largura) ? src.largura : {}),
    },
    furos: {
      ...defaults.furos,
      ...furosSrc,
      tecnicos: {
        ...defaults.furos.tecnicos,
        ...tecnicosSrc,
        cavilha: {
          ...defaults.furos.tecnicos.cavilha,
          ...asObject(tecnicosSrc.cavilha),
        },
        parafuso: {
          ...defaults.furos.tecnicos.parafuso,
          ...asObject(tecnicosSrc.parafuso),
        },
        dobradica: {
          ...defaults.furos.tecnicos.dobradica,
          ...asObject(tecnicosSrc.dobradica),
        },
        corredica: {
          ...defaults.furos.tecnicos.corredica,
          ...asObject(tecnicosSrc.corredica),
        },
        prateleira: {
          ...defaults.furos.tecnicos.prateleira,
          ...asObject(tecnicosSrc.prateleira),
        },
        dobradica_fixacao: {
          ...defaults.furos.tecnicos.dobradica_fixacao,
          ...asObject(tecnicosSrc.dobradica_fixacao),
          distanciaDaBordaCalco:
            (asObject(tecnicosSrc.dobradica_fixacao).distanciaDaBordaCalco as number) ??
            (asObject(tecnicosSrc.dobradica_fixacao).distanciaDaBorda as number) ??
            defaults.furos.tecnicos.dobradica_fixacao.distanciaDaBordaCalco,
          distanciaDaBordaParafusoUniao: (() => {
            const v = (asObject(tecnicosSrc.dobradica_fixacao).distanciaDaBordaParafusoUniao as number) ??
              defaults.furos.tecnicos.dobradica_fixacao.distanciaDaBordaParafusoUniao;
            return Math.abs(v - 60) < 1 ? 53 : v;
          })(),
          distanciaEntreFurosCalco:
            (asObject(tecnicosSrc.dobradica_fixacao).distanciaEntreFurosCalco as number) ??
            (asObject(tecnicosSrc.dobradica_fixacao).distanciaEntreFuros as number) ??
            defaults.furos.tecnicos.dobradica_fixacao.distanciaEntreFurosCalco,
        },
        shelfTop: {
          ...defaults.furos.tecnicos.shelfTop,
          ...asObject(tecnicosSrc.shelfTop),
        },
      },
    },
    madeira: {
      ...defaults.madeira,
      ...(isObject(src.madeira) ? src.madeira : {}),
    },
    qrcode: {
      ...defaults.qrcode,
      ...(isObject(src.qrcode) ? src.qrcode : {}),
      mostrarTextoAbaixoQr:
        (isObject(src.qrcode) ? src.qrcode : {}).mostrarTextoAbaixoQr == null
          ? defaults.qrcode.mostrarTextoAbaixoQr
          : Boolean((isObject(src.qrcode) ? src.qrcode : {}).mostrarTextoAbaixoQr),
      destacarNumeroPeca:
        (isObject(src.qrcode) ? src.qrcode : {}).destacarNumeroPeca == null
          ? defaults.qrcode.destacarNumeroPeca
          : Boolean((isObject(src.qrcode) ? src.qrcode : {}).destacarNumeroPeca),
      numeroDigitosPeca:
        Number((isObject(src.qrcode) ? src.qrcode : {}).numeroDigitosPeca) <= 2 ? 2 : 3,
    },
    etiqueta: {
      ...defaults.etiqueta,
      ...(isObject(src.etiqueta) ? src.etiqueta : {}),
    },
  };
}

/**
 * Calcula o número de dobradiças para uma porta com base na altura (cm).
 * Usado por: Configuração de Regras → Regras da Porta (UI); drillingAdapter e boxManufacturing para furos no Viewer e cutlist.
 */
export function getNumDobradicas(alturaMm: number, rules: RulesConfig): number {
  const ranges = rules?.portas?.ranges ?? [];
  if (!Number.isFinite(alturaMm) || alturaMm <= 0 || ranges.length === 0) return 2;

  const match = ranges.find((r) => alturaMm >= r.min && alturaMm <= r.max);
  if (match?.dobradicas != null) return Math.max(2, Number(match.dobradicas) || 2);

  // Se está acima do último range, usar SEMPRE o último range (evita fallback para 2).
  let last = ranges[0]!;
  for (const r of ranges) {
    if (r.max >= last.max) last = r;
  }
  if (alturaMm > last.max) return Math.max(2, Number(last.dobradicas) || 2);

  return 2;
}

/** Distância mínima (mm) da dobradiça ao fundo da porta para evitar dobradiça colada ao chão. */
const MIN_DIST_FUNDO_DOBRADICA_MM = 50;
/** Margem mínima (mm) ao topo e ao fundo do painel (porta e lateral) para posição das dobradiças. */
export const MIN_MARGEM_DOBRADICA_TOP_BOTTOM_MM = 70;

/**
 * Calcula as posições Y (mm) das dobradiças na porta/lateral.
 * Regra industrial: mínimo 2 dobradiças; primeira e última a ≥70 mm do topo e do fundo.
 * 2: Y_top = max(distTopo, 70), Y_bottom = altura − max(distFundo, 70)
 * 3: + Y_mid = (Y_top + Y_bottom) / 2
 * 4: + Y_mid1 e Y_mid2 a 1/3 e 2/3 entre topo e fundo.
 * O número de dobradiças (numHinges) deve vir de getNumDobradicas(alturaCm, rules) para respeitar Regras da Porta.
 */
export function getHingeYPositions(
  alturaMm: number,
  numHinges: number,
  rules: RulesConfig,
  /**
   * Posição Y (mm) da travessa/reforço horizontal, medida a partir da BASE da porta/painel.
   * Se definida, a dobradiça mais próxima é ajustada para ficar a 50mm acima/abaixo da travessa,
   * escolhendo a opção mais próxima da posição original.
   */
  travessaYMm?: number
): number[] {
  const cfg = rules?.furos?.tecnicos?.dobradica;
  if (!cfg || alturaMm <= 0) return [];
  const n = Math.max(2, numHinges);
  const distTopo = Number(cfg.distanciaDobradiçaTopo ?? cfg.offsetSuperior ?? 100);
  const distBase = Number(cfg.distanciaDobradiçaFundo ?? cfg.offsetInferior ?? 100);

  // Convenção industrial (e exemplos do produto):
  // Y é medido a partir da BASE do painel/porta:
  // - dobradiça inferior: distBase (ex.: 100mm)
  // - dobradiça superior: altura - distTopo (ex.: 1000mm → 900mm)
  const margem = MIN_MARGEM_DOBRADICA_TOP_BOTTOM_MM;
  const yBottom = Math.max(distBase, MIN_DIST_FUNDO_DOBRADICA_MM, margem);
  const yTop = Math.max(yBottom + 60, alturaMm - Math.max(distTopo, margem));

  const useManual =
    cfg.distribuicaoAutomatica === false &&
    Array.isArray(cfg.offsetsVerticaisMm) &&
    cfg.offsetsVerticaisMm.length >= n;
  if (useManual) {
    return cfg.offsetsVerticaisMm!.slice(0, n);
  }

  // Distribuição uniforme entre inferior e superior (inclui extremos).
  const result: number[] = [];
  const step = n > 1 ? (yTop - yBottom) / (n - 1) : 0;
  for (let i = 0; i < n; i++) {
    result.push(yBottom + step * i);
  }

  // Ajuste por travessa (se existir): move apenas a dobradiça mais próxima.
  if (Number.isFinite(travessaYMm) && (travessaYMm as number) > 0 && (travessaYMm as number) < alturaMm) {
    const t = Number(travessaYMm);
    const above = Math.max(yBottom, Math.min(yTop, t + 50));
    const below = Math.max(yBottom, Math.min(yTop, t - 50));

    let idx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < result.length; i++) {
      const d = Math.abs(result[i]! - t);
      if (d < bestDist) {
        bestDist = d;
        idx = i;
      }
    }
    const current = result[idx]!;
    const cand = Math.abs(current - below) <= Math.abs(current - above) ? below : above;
    result[idx] = cand;
  }

  // Manter ordem crescente e evitar valores fora do intervalo por arredondamentos.
  return result
    .map((y) => Math.max(yBottom, Math.min(yTop, y)))
    .sort((a, b) => a - b);
}

/**
 * Calcula o número de pés para uma caixa com base na largura (cm).
 */
export function getNumPes(larguraCm: number, rules: RulesConfig): number {
  const range = rules.pes.ranges.find((r) => larguraCm >= r.min && larguraCm <= r.max);
  return range?.pes ?? 4;
}

/**
 * Verifica se a altura permite divisor transversal (cm).
 */
export function permiteDivisorTransversal(alturaCm: number, rules: RulesConfig): boolean {
  return alturaCm >= rules.altura.divisorTransversalMin;
}

/**
 * Verifica se a largura permite divisor longitudinal (cm).
 */
export function permiteDivisorLongitudinal(larguraCm: number, rules: RulesConfig): boolean {
  return larguraCm >= rules.largura.divisorLongitudinalMin;
}

/**
 * Gera lista de posições Y (mm) para furos verticais nas laterais.
 */
export function calcularPosicoesFurosVerticais(
  alturaTotalMm: number,
  rules: RulesConfig
): number[] {
  if (!rules || !rules.furos || !rules.furos.tecnicos || !rules.furos.tecnicos.prateleira) {
    return [];
  }
  const p = rules.furos.tecnicos.prateleira;
  const margemTopo = (p.margemTopo ?? rules.furos.margemTopo) || 0;
  const margemBase = (p.margemBase ?? rules.furos.margemBase) || 0;
  const distanciaEntreFuros = (p.espacamento ?? rules.furos.distanciaEntreFuros) || 0;
  
  if (!Number.isFinite(alturaTotalMm) || alturaTotalMm <= 0) {
    return [];
  }
  
  const posicoes: number[] = [];
  let y = margemTopo;
  while (y <= alturaTotalMm - margemBase) {
    posicoes.push(y);
    y += distanciaEntreFuros;
  }
  return posicoes;
}
