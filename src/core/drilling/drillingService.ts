/**
 * Sistema de furação baseado em regras de marcenaria.
 * Fonte única para cálculo de furos e mapeamento DrillFace ↔ PanelFace (A/B).
 * Referência: docs/matriz-faces-A-B-FINAL.md — face interna = B, face externa = A.
 *
 * Top drilling: furos pela parte superior (topDrillable). Alinhado ao BoxBuilder/Viewer 3D,
 * Layout de Corte PRO e TCN: mesmas regras e distâncias (margemFrente/margemFundo, etc.).
 *
 * Prateleira (modelo mínimo FINAL): face interna = B = face que olha para baixo (interior da caixa);
 * face externa = A = face que olha para cima. getInternalFace("prateleira") = "fundo".
 */

import type { RulesConfig } from "../rules/rulesConfig";
import { getNumDobradicas, getHingeYPositions } from "../rules/rulesConfig";
import type { DrillFace, DrillType, PanelFace, TechnicalDrillHole } from "../types";

export type PieceType =
  | "cima"
  | "fundo"
  | "lateral_esquerda"
  | "lateral_direita"
  | "prateleira"
  | "porta"
  | "porta_simples"
  | "porta_dupla"
  | "porta_correr"
  | "gaveta"
  | "gaveta_frente"
  | "gaveta_lat_esq"
  | "gaveta_lat_dir"
  | "gaveta_fundo"
  | "gaveta_traseira"
  | string;

type PieceInput = {
  tipo: PieceType;
  largura: number;
  altura: number;
  espessura: number;
  /** Se false, desativa explicitamente os furos de prateleira para a peça. */
  shelfHolesEnabled?: boolean;
  hingeSide?: "left" | "right" | "top" | "bottom";
  /** Posições Y das dobradiças na porta (mm). Usado para furos de fixação na lateral (left/right). */
  /** Posições X (mm) para top/bottom: usadas em cima/fundo. */
  hingePositionsMm?: number[];
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Modelo 2D dobradiça Sensys 8645i (lado da porta):
 * - Copo: Ø35 mm, profundidade 13 mm, distância da borda 3 mm (inset) → centro do copo ≈ 22.5 mm.
 * - Dois furos de fixação a 52 mm entre si.
 * Usado para gerar furos na porta (master); laterais copiam posições.
 */
export const SENSYS_8645I_DOOR = {
  canecoDiametroMm: 35,
  canecoProfundidadeMm: 13,
  /** Distância da borda da porta ao centro do copo (mm). Padrão industrial 22.5 (≈ 3 mm inset + semi-diâmetro). */
  canecoCentroBordaMm: 22.5,
  distânciaBordaMm: 3,
  fixacaoPortaDiametroMm: 10,
  fixacaoPortaProfundidadeMm: 12,
  fixacaoPortaCentroBordaMm: 28,
  fixacaoPortaEntreCentrosMm: 52,
} as const;

/**
 * Base C00 (lado da caixa): retângulo 3D simples, 2 furos a 32 mm entre si, 37 mm da borda, altura 5–8 mm.
 */
export const SENSYS_BASE_C00 = {
  distanciaDaBordaMm: 37,
  distanciaEntreFurosCalcoMm: 32,
  alturaPeçaMm: 6,
  lateralDiametroMm: 5,
  lateralProfundidadeMm: 12,
  uniaoLateralBordaMm: 53,
} as const;

/**
 * Terceiro furo da base da dobradiça (parafuso união): apenas marcation de posição para montagem.
 * Não estrutural; não deve atravessar a peça. Regra industrial obrigatória.
 */
export const DOBRADICA_TERCEIRO_FURO = {
  diametroMm: 5,
  profundidadeMm: 0.5,
} as const;

/** @deprecated Use SENSYS_8645I_DOOR e SENSYS_BASE_C00 */
const SENSYS_8645I_C00 = {
  ...SENSYS_8645I_DOOR,
  calcoLateralBordaMm: SENSYS_BASE_C00.distanciaDaBordaMm,
  uniaoLateralBordaMm: SENSYS_BASE_C00.uniaoLateralBordaMm,
  lateralDiametroMm: SENSYS_BASE_C00.lateralDiametroMm,
  lateralProfundidadeMm: SENSYS_BASE_C00.lateralProfundidadeMm,
} as const;

function pushHole(
  out: TechnicalDrillHole[],
  piece: PieceInput,
  x: number,
  y: number,
  diametro: number,
  profundidade: number,
  tipo: DrillType,
  face: DrillFace,
  skipClamp?: boolean
) {
  const radius = Math.max(0.25, diametro / 2);
  const xSafe = skipClamp ? x : clamp(x, radius, Math.max(radius, piece.largura - radius));
  const ySafe = skipClamp ? y : clamp(y, radius, Math.max(radius, piece.altura - radius));
  out.push({
    x: xSafe,
    y: ySafe,
    diametro: Math.max(0.5, diametro),
    profundidade: Math.max(0.5, profundidade),
    tipo,
    face,
  });
}

/**
 * Face geométrica (DrillFace) que é a face interna do painel (lado para dentro do móvel).
 * Única fonte para semântica A/B: essa face recebe PanelFace "B"; as demais "A".
 */
export function getInternalFace(pieceType: PieceType): DrillFace {
  if (pieceType === "cima") return "fundo";
  if (pieceType === "fundo") return "cima";
  if (pieceType === "lateral_esquerda") return "direita";
  if (pieceType === "lateral_direita") return "esquerda";
  if (pieceType.startsWith("porta")) return "tras";
  if (pieceType === "gaveta_lat_esq") return "direita";
  if (pieceType === "gaveta_lat_dir") return "esquerda";
  if (pieceType === "gaveta_frente" || pieceType === "gaveta") return "tras";
  if (pieceType === "gaveta_fundo") return "cima";   // face interior = topo do painel (lado para dentro da gaveta)
  if (pieceType === "gaveta_traseira") return "frente"; // face interior = frente do painel (lado para dentro da gaveta)
  if (pieceType === "prateleira") return "fundo";   // FINAL: face interna = baixo (B), face externa = cima (A)
  return "frente";
}

/** Furos de cavilha (dowel). Cima/fundo: eixo a 60 mm dos bordos frente/fundo; centro a sideOffset (padrão 9.5 mm (espessura/2)) dos bordos esquerdo/direito (alinhamento com lateral 19 mm). */
function calcCavilha(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  if (!rules?.furos?.tecnicos?.cavilha) return;
  const cfg = rules.furos.tecnicos.cavilha;
  if (!cfg.enabled) return;
  const diametro = Number(cfg.diametro) > 0 ? Number(cfg.diametro) : 8;
  const profundidade = Number(cfg.profundidade) > 0 ? Number(cfg.profundidade) : Math.min(13, piece.espessura);
  const face = getInternalFace(piece.tipo);
  const insetLateral = Number(cfg.sideOffset) > 0 ? Number(cfg.sideOffset) : 9.5;

  if ((piece.tipo === "cima" || piece.tipo === "fundo") && (cfg.aplicarEm.cima || cfg.aplicarEm.fundo)) {
    const xLeft = insetLateral;
    const xRight = piece.largura - insetLateral;
    const distFrente = Number(cfg.distanciaFrente) > 0 ? Number(cfg.distanciaFrente) : 60;
    const distFundo = Number(cfg.distanciaFundo) > 0 ? Number(cfg.distanciaFundo) : 60;
    const yFront = distFrente;
    const yBack = piece.altura - distFundo;
    pushHole(out, piece, xLeft, yFront, diametro, profundidade, "cavilha", face);
    pushHole(out, piece, xLeft, yBack, diametro, profundidade, "cavilha", face);
    pushHole(out, piece, xRight, yFront, diametro, profundidade, "cavilha", face);
    pushHole(out, piece, xRight, yBack, diametro, profundidade, "cavilha", face);
  }
  /* Laterais: apenas furos de prateleira e fixação de dobradiça (calcPrateleira32mm e calcDobradicaFixacao). Sem cavilha nas laterais. */
}

/** Furos de parafuso (confirmat). União topo/base: mesma linha que cavilha (9mm), parafuso a 40mm da frente/fundo. */
function calcParafuso(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  if (!rules?.furos?.tecnicos?.parafuso) return;
  const cfg = rules.furos.tecnicos.parafuso;
  if (!cfg.enabled) return;
  if (piece.tipo !== "cima" && piece.tipo !== "fundo") return;
  if ((piece.tipo === "cima" && !cfg.aplicarEm.cima) || (piece.tipo === "fundo" && !cfg.aplicarEm.fundo)) return;
  const face = getInternalFace(piece.tipo);
  const diametro = Number(cfg.diametro) > 0 ? Number(cfg.diametro) : 4;
  const cfgDepth = Number(cfg.profundidade) > 0 ? Number(cfg.profundidade) : piece.espessura;
  const depth = cfg.profundidadeIgualEspessura ? piece.espessura : Math.min(piece.espessura, cfgDepth);
  const sideOffset = cfg.sideOffset ?? 9.5;
  const xLeft = sideOffset;
  const xRight = piece.largura - sideOffset;
  if (process.env.NODE_ENV === "development" && cfg.distanciaFrente == null) {
    console.warn("[drilling] parafuso distanciaFrente is undefined, using fallback");
  }
  const yFront = cfg.distanciaFrente ?? 90;
  const yBack = piece.altura - (cfg.distanciaFundo ?? 90);
  pushHole(out, piece, xLeft, yFront, diametro, depth, "parafuso", face);
  pushHole(out, piece, xLeft, yBack, diametro, depth, "parafuso", face);
  pushHole(out, piece, xRight, yFront, diametro, depth, "parafuso", face);
  pushHole(out, piece, xRight, yBack, diametro, depth, "parafuso", face);
}

/**
 * Furação da dobradiça na porta (todas as medidas ao CENTRO do furo):
 * - Caneco: Ø35 mm, 13 mm prof., centro a 22.5 mm da borda da porta.
 * - Dois furos de fixação: centro a 28 mm da borda, 52 mm entre centros, Ø10 mm, 12 mm prof.
 * - left/right: borda vertical (eixo X fixo, posições ao longo de Y).
 * - top/bottom: borda horizontal (Sensys 8645i rotacionado 90°: eixo Y fixo, posições ao longo de X).
 */
function calcDobradica(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  if (!rules?.furos?.tecnicos?.dobradica) return;
  const cfg = rules.furos.tecnicos.dobradica;
  if (!cfg.enabled) return;
  if (!piece.tipo.startsWith("porta")) return;
  const face: DrillFace = "tras";
  // Centro do caneco: referência geométrica principal (22.5 mm). Ignora legado ambíguo em distanciaBordaLateral.
  const distCentroCaneco =
    Number(cfg.distanciaCentroDaBorda) > 0
      ? Number(cfg.distanciaCentroDaBorda)
      : SENSYS_8645I_C00.canecoCentroBordaMm;
  // Regras da Porta: número de dobradiças por altura/largura (cm). Fallback: config técnica.
  const numHinges =
    piece.hingeSide === "top" || piece.hingeSide === "bottom"
      ? getNumDobradicas(piece.largura / 10, rules)
      : getNumDobradicas(piece.altura / 10, rules);
  const numHingesClamped = Math.max(2, numHinges);
  const diametroCaneco = Number(cfg.diametro) > 0 ? Number(cfg.diametro) : SENSYS_8645I_C00.canecoDiametroMm;
  const profundidadeCaneco = Math.min(
    piece.espessura,
    Number(cfg.profundidade) > 0 ? Number(cfg.profundidade) : SENSYS_8645I_C00.canecoProfundidadeMm
  );
  const distCentroFixacao = Number(cfg.distanciaFurosFixacaoBorda) > 0
    ? Number(cfg.distanciaFurosFixacaoBorda)
    : SENSYS_8645I_C00.fixacaoPortaCentroBordaMm;
  const distEntreCentrosFixacao = Number(cfg.distanciaEntreFurosFixacao) > 0
    ? Number(cfg.distanciaEntreFurosFixacao)
    : SENSYS_8645I_C00.fixacaoPortaEntreCentrosMm;
  const halfFix = distEntreCentrosFixacao / 2;
  const diametroFixacao = Number(cfg.diametroFurosFixacao) > 0
    ? Number(cfg.diametroFurosFixacao)
    : SENSYS_8645I_C00.fixacaoPortaDiametroMm;
  const profundidadeFixacao = Math.min(
    piece.espessura,
    Number(cfg.profundidadeFurosFixacao) > 0 ? Number(cfg.profundidadeFurosFixacao) : SENSYS_8645I_C00.fixacaoPortaProfundidadeMm
  );

  /* Porta superior ou inferior: dobradiça na borda top/bottom (eixo Y fixo, posições ao longo da largura = X).
   * Convenção: Y=0 no topo da peça, Y cresce para baixo. Borda superior = Y pequeno, borda inferior = Y grande. */
  if (piece.hingeSide === "top" || piece.hingeSide === "bottom") {
    const offsetsX = getHingeYPositions(piece.largura, numHingesClamped, rules);
    if (offsetsX.length === 0) return;
    /* top = borda SUPERIOR = menor Y → y = dist. bottom = borda INFERIOR = maior Y → y = altura - dist. */
    const yCaneco = piece.hingeSide === "top" ? distCentroCaneco : piece.altura - distCentroCaneco;
    const yFixacao = piece.hingeSide === "top" ? distCentroFixacao : piece.altura - distCentroFixacao;
    for (const ox of offsetsX) {
      pushHole(out, piece, ox, yCaneco, diametroCaneco, profundidadeCaneco, "dobradica", face, true);
      pushHole(out, piece, ox - halfFix, yFixacao, diametroFixacao, profundidadeFixacao, "dobradica_fixacao", face, true);
      pushHole(out, piece, ox + halfFix, yFixacao, diametroFixacao, profundidadeFixacao, "dobradica_fixacao", face, true);
    }
    return;
  }

  /* Laterais (left/right): comportamento existente inalterado. */
  const hingeSide = piece.hingeSide === "left" || piece.hingeSide === "right" ? piece.hingeSide : "left";
  const offsets = getHingeYPositions(piece.altura, numHingesClamped, rules);
  if (offsets.length === 0) return;
  const xCaneco = hingeSide === "left" ? piece.largura - distCentroCaneco : piece.largura - distCentroCaneco;
  const xFixacao = hingeSide === "left" ? piece.largura - distCentroFixacao : piece.largura - distCentroFixacao;

  for (const oy of offsets) {
    pushHole(out, piece, xCaneco, oy, diametroCaneco, profundidadeCaneco, "dobradica", face, true);
    pushHole(out, piece, xFixacao, oy - halfFix, diametroFixacao, profundidadeFixacao, "dobradica_fixacao", face, true);
    pushHole(out, piece, xFixacao, oy + halfFix, diametroFixacao, profundidadeFixacao, "dobradica_fixacao", face, true);
  }
}

/** Furos de corrediça de gaveta: apenas nas laterais de gaveta, não nas laterais do módulo. */
function calcCorredica(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  if (!rules?.furos?.tecnicos?.corredica) return;
  const cfg = rules.furos.tecnicos.corredica;
  if (!cfg.enabled) return;
  const isDrawerSide =
    piece.tipo === "gaveta_lat_esq" || piece.tipo === "gaveta_lat_dir" || piece.tipo === "gaveta";
  if (!isDrawerSide) return;
  const face =
    piece.tipo === "gaveta_lat_esq" ? "direita" : piece.tipo === "gaveta_lat_dir" ? "esquerda" : "frente";
  const y = (cfg.alturaRelativaFundo ?? 37) + (cfg.offsetVerticalAdicional ?? 0);
  const xFront = cfg.offsetFrente ?? 37;
  const xBack = piece.largura - (cfg.offsetFundo ?? 37);
  const diametro = cfg.diametro ?? 5;
  const profundidade = cfg.profundidade ?? 10;
  pushHole(out, piece, xFront, y, diametro, profundidade, "corredica", face);
  pushHole(out, piece, xBack, y, diametro, profundidade, "corredica", face);
}

/**
 * Sistema 32 variável para furos de prateleira nas laterais.
 * Exatamente 2 linhas: frente (margemFrente) e fundo (margemFundo). Lateral esquerda com X espelhado.
 */
function calcPrateleira32mm(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  if (!rules?.furos?.tecnicos?.prateleira) return;
  const cfg = rules.furos.tecnicos.prateleira;
  if (!cfg.enabled) return;
  if (piece.shelfHolesEnabled === false) return;
  if (piece.tipo !== "lateral_esquerda" && piece.tipo !== "lateral_direita") return;
  const face = piece.tipo === "lateral_esquerda" ? "direita" : "esquerda";

  const diametro = cfg.diametro ?? 5;
  const profundidade = cfg.profundidade ?? 13;
  const margemFrente = cfg.margemFrente ?? cfg.distanciaDaBorda ?? 60;
  const margemFundo = cfg.margemFundo ?? cfg.distanciaDaBorda ?? 60;

  const margemTopo = cfg.margemTopo ?? 200;
  const margemBase = cfg.margemBase ?? 200;
  const minFuros = cfg.minFurosPorColuna ?? 6;
  const maxFuros = cfg.maxFurosPorColuna ?? 40;

  const zonaUtil = Math.max(0, piece.altura - margemTopo - margemBase);
  if (zonaUtil <= 0) return;

  const numFurosBruto = Math.ceil(zonaUtil / 32);
  let numFuros = clamp(numFurosBruto, minFuros, maxFuros);
  const espacamento = numFuros > 1 ? zonaUtil / (numFuros - 1) : 0;
  const espacamentoClamped = clamp(espacamento, 30, 50);
  if (numFuros > 1 && espacamentoClamped !== espacamento) {
    numFuros = Math.floor(zonaUtil / espacamentoClamped) + 1;
    numFuros = clamp(numFuros, minFuros, maxFuros);
  }

  const isEsquerda = piece.tipo === "lateral_esquerda";
  const xFrente = isEsquerda ? piece.largura - margemFrente : margemFrente;
  const xFundo = isEsquerda ? margemFundo : piece.largura - margemFundo;

  const step = numFuros > 1 ? zonaUtil / (numFuros - 1) : zonaUtil;
  for (let i = 0; i < numFuros; i++) {
    const y = margemTopo + (numFuros > 1 ? i * step : zonaUtil / 2);
    pushHole(out, piece, xFrente, y, diametro, profundidade, "prateleira", face);
    pushHole(out, piece, xFundo, y, diametro, profundidade, "prateleira", face);
  }
}

/** Furos de fixação da dobradiça na lateral: 3 por dobradiça (2 principais calço + 1 parafuso união). Padrão ferragem: 37 mm da borda lateral (calço), 53 mm da borda frontal (parafuso união), 16 mm entre eles. */
const DEFAULTS_DOBRADICA_FIXACAO = {
  distanciaDaBordaCalco: SENSYS_8645I_C00.calcoLateralBordaMm,
  distanciaDaBordaParafusoUniao: SENSYS_8645I_C00.uniaoLateralBordaMm,
} as const;

function calcDobradicaFixacao(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  const cfg = rules?.furos?.tecnicos?.dobradica_fixacao;
  if (!cfg?.enabled) return;

  /* Painel superior (hingeSide top): furos no cima, posições X = hingePositionsMm (cópia da porta), Y = dist da borda da dobradiça (frente). */
  if (piece.tipo === "cima" && (piece.hingeSide === "top") && (piece.hingePositionsMm?.length ?? 0) > 0) {
    const face: DrillFace = "fundo";
    let yCalco = Number(cfg.distanciaDaBordaCalco);
    if (!Number.isFinite(yCalco) || yCalco <= 0) yCalco = DEFAULTS_DOBRADICA_FIXACAO.distanciaDaBordaCalco;
    let yUniao = Number(cfg.distanciaDaBordaParafusoUniao);
    if (!Number.isFinite(yUniao) || yUniao <= 0) yUniao = DEFAULTS_DOBRADICA_FIXACAO.distanciaDaBordaParafusoUniao;
    /* Borda da dobradiça no painel cima = frente (Y pequeno). Furos a dist e distUniao dessa borda. */
    const distEntre = cfg.distanciaEntreFurosCalco ?? cfg.distanciaEntreFuros ?? 32;
    const halfDist = distEntre / 2;
    const diametroCalco = cfg.diametro ?? SENSYS_8645I_C00.lateralDiametroMm;
    const profundidadeCalco = cfg.profundidadeFuro ?? SENSYS_8645I_C00.lateralProfundidadeMm;
    for (const hingeX of piece.hingePositionsMm!) {
      pushHole(out, piece, hingeX - halfDist, yCalco, diametroCalco, profundidadeCalco, "dobradica_fixacao", face, true);
      pushHole(out, piece, hingeX + halfDist, yCalco, diametroCalco, profundidadeCalco, "dobradica_fixacao", face, true);
      pushHole(out, piece, hingeX, yUniao, DOBRADICA_TERCEIRO_FURO.diametroMm, DOBRADICA_TERCEIRO_FURO.profundidadeMm, "dobradica_parafuso_uniao", face, true);
    }
    return;
  }

  /* Painel inferior (hingeSide bottom): furos de fixação da base da dobradiça no fundo. X = cópia da porta (porta = master), Y = dist da borda da dobradiça (frente). */
  if (piece.tipo === "fundo" && piece.hingeSide === "bottom") {
    const numHinges = Math.max(2, getNumDobradicas(piece.largura / 10, rules));
    const positionsX = (piece.hingePositionsMm?.length ?? 0) > 0
      ? piece.hingePositionsMm!
      : getHingeYPositions(piece.largura, numHinges, rules);
    if (positionsX.length === 0) return;

    const face: DrillFace = "cima";
    let yCalco = Number(cfg.distanciaDaBordaCalco);
    if (!Number.isFinite(yCalco) || yCalco <= 0) yCalco = DEFAULTS_DOBRADICA_FIXACAO.distanciaDaBordaCalco;
    let yUniao = Number(cfg.distanciaDaBordaParafusoUniao);
    if (!Number.isFinite(yUniao) || yUniao <= 0) yUniao = DEFAULTS_DOBRADICA_FIXACAO.distanciaDaBordaParafusoUniao;
    /* Borda da dobradiça no painel fundo = frente (Y pequeno). Mesma convenção que cima. */
    const distEntre = cfg.distanciaEntreFurosCalco ?? cfg.distanciaEntreFuros ?? 32;
    const halfDist = distEntre / 2;
    const diametroCalco = cfg.diametro ?? SENSYS_8645I_C00.lateralDiametroMm;
    const profundidadeCalco = cfg.profundidadeFuro ?? SENSYS_8645I_C00.lateralProfundidadeMm;
    for (const hingeX of positionsX) {
      pushHole(out, piece, hingeX - halfDist, yCalco, diametroCalco, profundidadeCalco, "dobradica_fixacao", face, true);
      pushHole(out, piece, hingeX + halfDist, yCalco, diametroCalco, profundidadeCalco, "dobradica_fixacao", face, true);
      pushHole(out, piece, hingeX, yUniao, DOBRADICA_TERCEIRO_FURO.diametroMm, DOBRADICA_TERCEIRO_FURO.profundidadeMm, "dobradica_parafuso_uniao", face, true);
    }
    return;
  }

  /* Laterais (left/right): comportamento existente inalterado. */
  if (piece.tipo !== "lateral_esquerda" && piece.tipo !== "lateral_direita") return;

  const face = piece.tipo === "lateral_esquerda" ? "direita" : "esquerda";
  let xCalco = Number(cfg.distanciaDaBordaCalco);
  if (!Number.isFinite(xCalco) || xCalco <= 0) xCalco = DEFAULTS_DOBRADICA_FIXACAO.distanciaDaBordaCalco;
  let xUniao = Number(cfg.distanciaDaBordaParafusoUniao);
  if (!Number.isFinite(xUniao) || xUniao <= 0) xUniao = DEFAULTS_DOBRADICA_FIXACAO.distanciaDaBordaParafusoUniao;
  if (piece.tipo === "lateral_esquerda") {
    xCalco = piece.largura - xCalco;
    xUniao = piece.largura - xUniao;
  }
  const distEntre = cfg.distanciaEntreFurosCalco ?? cfg.distanciaEntreFuros ?? 32;
  const halfDist = distEntre / 2;
  const diametroCalco = cfg.diametro ?? SENSYS_8645I_C00.lateralDiametroMm;
  const profundidadeCalco = cfg.profundidadeFuro ?? SENSYS_8645I_C00.lateralProfundidadeMm;

  const hinges = piece.hingePositionsMm ?? [];
  for (const hingeY of hinges) {
    pushHole(out, piece, xCalco, hingeY - halfDist, diametroCalco, profundidadeCalco, "dobradica_fixacao", face, true);
    pushHole(out, piece, xCalco, hingeY + halfDist, diametroCalco, profundidadeCalco, "dobradica_fixacao", face, true);
    pushHole(out, piece, xUniao, hingeY, DOBRADICA_TERCEIRO_FURO.diametroMm, DOBRADICA_TERCEIRO_FURO.profundidadeMm, "dobradica_parafuso_uniao", face, true);
  }
}

export function calculateTechnicalDrillingsForPiece(
  piece: PieceInput,
  rules: RulesConfig
): TechnicalDrillHole[] {
  const out: TechnicalDrillHole[] = [];
  if (!piece || !piece.tipo || !Number.isFinite(piece.largura) || !Number.isFinite(piece.altura)) return out;
  if (!rules || !rules.furos) return out;
  try {
    calcCavilha(piece, rules, out);
    calcParafuso(piece, rules, out);
    calcDobradica(piece, rules, out);
    calcCorredica(piece, rules, out);
    calcPrateleira32mm(piece, rules, out);
    calcDobradicaFixacao(piece, rules, out);
  } catch (err) {
    console.warn(`[drillingService] Error calculating drills for ${piece.tipo}:`, err);
  }
  return out;
}

/**
 * Converte DrillFace (geometria) em PanelFace (A/B). Regra FINAL: face interna do painel = B.
 * Única fonte desta conversão no projeto; drillingAdapter reutiliza esta função.
 */
export function drillFaceToPanelFace(face: DrillFace, pieceType: PieceType): PanelFace {
  return face === getInternalFace(pieceType) ? "B" : "A";
}

export function isTopDrillable(face: DrillFace): boolean {
  return face === "cima" || face === "fundo";
}
