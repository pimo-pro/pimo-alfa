/**
 * Sistema de furação baseado em regras de marcenaria.
 * Top drilling apenas: furos pela parte superior.
 * Sem furação lateral. Sem ficheiros de drill separados.
 */

import type { RulesConfig } from "../rules/rulesConfig";
import { getHingeYPositions } from "../rules/rulesConfig";
import type { CutListItem, DrillFace, DrillType, PanelDrillHole, PanelFace, TechnicalDrillHole } from "../types";

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
  | string;

type PieceInput = {
  tipo: PieceType;
  largura: number;
  altura: number;
  espessura: number;
  /** Posições Y das dobradiças na porta (mm). Usado para furos de fixação na lateral. */
  hingePositionsMm?: number[];
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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

function getInternalFace(pieceType: PieceType): DrillFace {
  if (pieceType === "cima") return "fundo";
  if (pieceType === "fundo") return "cima";
  if (pieceType === "lateral_esquerda") return "direita";
  if (pieceType === "lateral_direita") return "esquerda";
  if (pieceType.startsWith("porta") || pieceType === "gaveta" || pieceType.startsWith("gaveta")) return "frente";
  return "frente";
}

/** Furos de cavilha (dowel). União topo/base: linha a 9mm da borda, cavilha a 60mm da frente/fundo. */
function calcCavilha(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  if (!rules?.furos?.tecnicos?.cavilha) return;
  const cfg = rules.furos.tecnicos.cavilha;
  if (!cfg.enabled) return;
  const diametro = Number(cfg.diametro) > 0 ? Number(cfg.diametro) : 8;
  const profundidade = Number(cfg.profundidade) > 0 ? Number(cfg.profundidade) : Math.min(13, piece.espessura);
  const face = getInternalFace(piece.tipo);
  const offsetBorda = cfg.offsetDaBorda ?? 9;

  if ((piece.tipo === "cima" || piece.tipo === "fundo") && (cfg.aplicarEm.cima || cfg.aplicarEm.fundo)) {
    const xLeft = offsetBorda;
    const xRight = piece.largura - offsetBorda;
    const yFront = cfg.distanciaFrente ?? 60;
    const yBack = piece.altura - (cfg.distanciaFundo ?? 60);
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
  const offsetBorda = cfg.offsetDaBorda ?? 9;
  const xLeft = offsetBorda;
  const xRight = piece.largura - offsetBorda;
  const yFront = cfg.distanciaFrente ?? 40;
  const yBack = piece.altura - (cfg.distanciaFundo ?? 40);
  pushHole(out, piece, xLeft, yFront, diametro, depth, "parafuso", face);
  pushHole(out, piece, xLeft, yBack, diametro, depth, "parafuso", face);
  pushHole(out, piece, xRight, yFront, diametro, depth, "parafuso", face);
  pushHole(out, piece, xRight, yBack, diametro, depth, "parafuso", face);
}

/** Furos da casa da dobradiça na porta: 35 mm, 12–13 mm prof, posições Y por getHingeYPositions. */
function calcDobradica(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  if (!rules?.furos?.tecnicos?.dobradica) return;
  const cfg = rules.furos.tecnicos.dobradica;
  if (!cfg.enabled) return;
  if (!piece.tipo.startsWith("porta")) return;
  const face: DrillFace = "tras";
  const distCentroBorda = cfg.distanciaCentroDaBorda ?? cfg.distanciaBordaLateral ?? 21.5;
  const numHinges = Math.max(2, cfg.numeroPorPorta ?? 2);
  const offsets = getHingeYPositions(piece.altura, numHinges, rules);
  if (offsets.length === 0) return;
  const x = piece.largura - distCentroBorda;
  const diametro = cfg.diametro ?? 35;
  const profundidade = Math.min(piece.espessura, cfg.profundidade ?? 13);
  for (const oy of offsets) {
    pushHole(out, piece, x, oy, diametro, profundidade, "dobradica", face);
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

/** Furos de fixação da dobradiça na lateral: 3 por dobradiça (2 calço + 1 parafuso união). Lateral esquerda com X espelhado. */
function calcDobradicaFixacao(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  const cfg = rules?.furos?.tecnicos?.dobradica_fixacao;
  if (!cfg?.enabled) return;
  if (piece.tipo !== "lateral_esquerda" && piece.tipo !== "lateral_direita") return;

  const face = piece.tipo === "lateral_esquerda" ? "direita" : "esquerda";
  let xCalco = cfg.distanciaDaBordaCalco ?? cfg.distanciaDaBorda ?? 37;
  let xUniao = cfg.distanciaDaBordaParafusoUniao ?? 53;
  if (piece.tipo === "lateral_esquerda") {
    xCalco = piece.largura - xCalco;
    xUniao = piece.largura - xUniao;
  }
  const distEntre = cfg.distanciaEntreFurosCalco ?? cfg.distanciaEntreFuros ?? 32;
  const halfDist = distEntre / 2;
  const diametroCalco = cfg.diametro ?? 5;
  const profundidadeCalco = cfg.profundidadeFuro ?? 12;
  const diametroUniao = cfg.diametroParafusoUniao ?? 5;
  const profundidadeUniao = cfg.profundidadeParafusoUniao ?? 12;

  const hinges = piece.hingePositionsMm ?? [];
  for (const hingeY of hinges) {
    pushHole(out, piece, xCalco, hingeY - halfDist, diametroCalco, profundidadeCalco, "dobradica_fixacao", face, true);
    pushHole(out, piece, xCalco, hingeY + halfDist, diametroCalco, profundidadeCalco, "dobradica_fixacao", face, true);
    pushHole(out, piece, xUniao, hingeY, diametroUniao, profundidadeUniao, "dobradica_parafuso_uniao", face, true);
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

function drillFaceToPanelFace(face: DrillFace): PanelFace {
  switch (face) {
    case "frente":
    case "cima":
    case "esquerda":
      return "A";
    default:
      return "B";
  }
}

function technicalToPanelDrillHoles(furacoesTecnicas: TechnicalDrillHole[]): PanelDrillHole[] {
  return furacoesTecnicas.map((h) => ({
    x: h.x,
    y: h.y,
    diameter: h.diametro,
    depth: h.profundidade,
    holeType: h.tipo,
    face: drillFaceToPanelFace(h.face),
    topDrillable:
      isTopDrillable(h.face) ||
      h.tipo === "dobradica" ||
      h.tipo === "dobradica_fixacao" ||
      h.tipo === "dobradica_parafuso_uniao" ||
      h.tipo === "prateleira",
  }));
}

export function applyDrillingsToCutListItems(items: CutListItem[], rules: RulesConfig): CutListItem[] {
  return items.map((item) => {
    if (!item || !item.tipo || !item.dimensoes) return item;
    const furacoesTecnicas = calculateTechnicalDrillingsForPiece(
      {
        tipo: item.tipo,
        largura: item.dimensoes.largura ?? 0,
        altura: item.dimensoes.altura ?? 0,
        espessura: item.espessura ?? 0,
      },
      rules
    );
    return {
      ...item,
      drillHoles: technicalToPanelDrillHoles(furacoesTecnicas),
    };
  });
}

export function isTopDrillable(face: DrillFace): boolean {
  return face === "cima" || face === "fundo";
}
