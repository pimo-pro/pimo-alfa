/**
 * Configuração central de todas as regras dinâmicas do projeto.
 * Controla: portas, prateleiras, pés, divisores, furos, madeira/estrutura.
 * Editável via Admin; afeta todo o projeto automaticamente.
 */

export type PortaRange = {
  /** Altura mínima da porta (cm). */
  min: number;
  /** Altura máxima da porta (cm). */
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
        distanciaFrente: number;
        distanciaFundo: number;
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
        distanciaBordaLateral: number;
        offsetSuperior: number;
        offsetInferior: number;
        numeroPorPorta: number;
        offsetsVerticaisMm: number[];
        diametro: number;
        profundidade: number;
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
        recuoBorda: number;
        espacamento: number;
        numeroFurosPorColuna: number;
        diametro: number;
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
      { min: 10, max: 50, dobradicas: 2 },
      { min: 51, max: 100, dobradicas: 3 },
      { min: 101, max: 150, dobradicas: 3 },
      { min: 151, max: 200, dobradicas: 4 },
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
        distanciaBordaLateral: 22,
        offsetSuperior: 100,
        offsetInferior: 100,
        numeroPorPorta: 2,
        offsetsVerticaisMm: [],
        diametro: 35,
        profundidade: 12,
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
        margemTopo: 80,
        margemBase: 80,
        recuoBorda: 37,
        espacamento: 32,
        numeroFurosPorColuna: 0,
        diametro: 5,
        profundidade: 8,
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
 */
export function getNumDobradicas(alturaCm: number, rules: RulesConfig): number {
  const range = rules.portas.ranges.find((r) => alturaCm >= r.min && alturaCm <= r.max);
  return range?.dobradicas ?? 2;
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
