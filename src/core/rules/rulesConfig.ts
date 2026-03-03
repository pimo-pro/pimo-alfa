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
        /** Linha de furação: offset da borda esquerda/direita (meio espessura ≈ 9mm). */
        offsetDaBorda: number;
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
        offsetDaBorda: 9,
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
        profundidadeParafusoUniao: 12,
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
 */
export function getNumDobradicas(alturaCm: number, rules: RulesConfig): number {
  const range = rules.portas.ranges.find((r) => alturaCm >= r.min && alturaCm <= r.max);
  return range?.dobradicas ?? 2;
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
 */
export function getHingeYPositions(
  alturaMm: number,
  numHinges: number,
  rules: RulesConfig
): number[] {
  const cfg = rules?.furos?.tecnicos?.dobradica;
  if (!cfg || alturaMm <= 0) return [];
  const n = Math.max(2, numHinges);
  const distTopo = cfg.distanciaDobradiçaTopo ?? cfg.offsetSuperior ?? 100;
  const distFundo = cfg.distanciaDobradiçaFundo ?? cfg.offsetInferior ?? 100;
  const margem = MIN_MARGEM_DOBRADICA_TOP_BOTTOM_MM;
  const distFundoSafe = Math.max(distFundo, MIN_DIST_FUNDO_DOBRADICA_MM, margem);
  const yFirst = Math.max(distTopo, margem);
  const yLast = Math.max(yFirst + 60, alturaMm - distFundoSafe);

  const useManual =
    cfg.distribuicaoAutomatica === false &&
    Array.isArray(cfg.offsetsVerticaisMm) &&
    cfg.offsetsVerticaisMm.length >= n;
  if (useManual) {
    return cfg.offsetsVerticaisMm!.slice(0, n);
  }

  if (n === 2) return [yFirst, yLast];
  if (n === 3) {
    const yMid = (yFirst + yLast) / 2;
    return [yFirst, yMid, yLast];
  }
  if (n === 4) {
    const step = (yLast - yFirst) / 3;
    return [yFirst, yFirst + step, yFirst + step * 2, yLast];
  }
  const result: number[] = [yFirst];
  for (let i = 1; i < n - 1; i++) {
    const t = i / (n - 1);
    result.push(yFirst + (yLast - yFirst) * t);
  }
  result.push(yLast);
  return result;
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
