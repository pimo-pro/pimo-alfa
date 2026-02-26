/**
 * Sistema de furação baseado em regras de marcenaria.
 * Top drilling apenas: furos pela parte superior.
 * Sem furação lateral. Sem ficheiros de drill separados.
 */

import type { CncDrillOperation } from "../cnc/cncTypes";
import type { RulesConfig } from "../rules/rulesConfig";
import type { CutListItem, DrillFace, DrillType, TechnicalDrillHole } from "../types";

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
  face: DrillFace
) {
  const radius = Math.max(0.25, diametro / 2);
  const xSafe = clamp(x, radius, Math.max(radius, piece.largura - radius));
  const ySafe = clamp(y, radius, Math.max(radius, piece.altura - radius));
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
  if (
    (piece.tipo === "lateral_esquerda" && cfg.aplicarEm.lateralEsquerda) ||
    (piece.tipo === "lateral_direita" && cfg.aplicarEm.lateralDireita)
  ) {
    const xFront = cfg.distanciaFrente;
    const xBack = piece.largura - cfg.distanciaFundo;
    const yTop = cfg.distanciaTopo;
    const yBottom = piece.altura - cfg.distanciaBase;
    pushHole(out, piece, xFront, yTop, diametro, profundidade, "cavilha", face);
    pushHole(out, piece, xBack, yTop, diametro, profundidade, "cavilha", face);
    pushHole(out, piece, xFront, yBottom, diametro, profundidade, "cavilha", face);
    pushHole(out, piece, xBack, yBottom, diametro, profundidade, "cavilha", face);
  }
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

/** Furos de dobradiça: lateral da porta (não centro). 35mm, 12–13mm prof, 21–22mm da borda da dobradiça. */
function calcDobradica(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  if (!rules?.furos?.tecnicos?.dobradica) return;
  const cfg = rules.furos.tecnicos.dobradica;
  if (!cfg.enabled) return;
  if (!piece.tipo.startsWith("porta")) return;
  const face: DrillFace = "tras";
  const distCentroBorda = cfg.distanciaCentroDaBorda ?? cfg.distanciaBordaLateral ?? 21.5;
  const distTopo = cfg.distanciaDobradiçaTopo ?? cfg.offsetSuperior ?? 100;
  const distFundo = cfg.distanciaDobradiçaFundo ?? cfg.offsetInferior ?? 100;
  const x = piece.largura - distCentroBorda;
  let offsets: number[] =
    cfg.offsetsVerticaisMm?.length > 0
      ? cfg.offsetsVerticaisMm
      : [distTopo, piece.altura - distFundo];
  if ((cfg.numeroPorPorta ?? 2) > 0 && offsets.length > (cfg.numeroPorPorta ?? 2)) {
    offsets = offsets.slice(0, cfg.numeroPorPorta ?? 2);
  }
  const diametro = cfg.diametro ?? 35;
  const profundidade = cfg.profundidade ?? 12.5;
  for (const oy of offsets) {
    pushHole(out, piece, x, oy, diametro, profundidade, "dobradica", face);
  }
}

/** Furos de corrediça de gaveta conforme altura da gaveta. */
function calcCorredica(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  if (!rules?.furos?.tecnicos?.corredica) return;
  const cfg = rules.furos.tecnicos.corredica;
  if (!cfg.enabled) return;
  const isDrawerSide =
    piece.tipo === "gaveta_lat_esq" || piece.tipo === "gaveta_lat_dir" || piece.tipo === "gaveta";
  const isCabinetSide = piece.tipo === "lateral_esquerda" || piece.tipo === "lateral_direita";
  if (!isDrawerSide && !isCabinetSide) return;
  const face =
    piece.tipo === "lateral_esquerda" ? "direita" : piece.tipo === "lateral_direita" ? "esquerda" : "frente";
  const y = (cfg.alturaRelativaFundo ?? 37) + (cfg.offsetVerticalAdicional ?? 0);
  const xFront = cfg.offsetFrente ?? 37;
  const xBack = piece.largura - (cfg.offsetFundo ?? 37);
  const diametro = cfg.diametro ?? 5;
  const profundidade = cfg.profundidade ?? 10;
  pushHole(out, piece, xFront, y, diametro, profundidade, "corredica", face);
  pushHole(out, piece, xBack, y, diametro, profundidade, "corredica", face);
}

/**
 * Sistema 32mm para furos de prateleira nas laterais.
 * Margens superior/inferior configuráveis. Se altura ≤500mm: ~6 furos. Se 500–1000mm: margens 200mm.
 */
function calcPrateleira32mm(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  if (!rules?.furos?.tecnicos?.prateleira) return;
  const cfg = rules.furos.tecnicos.prateleira;
  if (!cfg.enabled) return;
  if (piece.tipo !== "lateral_esquerda" && piece.tipo !== "lateral_direita") return;
  const face = piece.tipo === "lateral_esquerda" ? "direita" : "esquerda";

  const espacamento = cfg.espacamentoVertical ?? cfg.espacamento ?? 32;
  const diametro = cfg.diametro ?? 5;
  const profundidade = cfg.profundidade ?? 13;
  const recuoBorda = cfg.recuoBorda ?? 37;

  let margemTopo = cfg.margemTopo ?? 200;
  let margemBase = cfg.margemBase ?? 200;
  const minFuros = cfg.minFurosPorColuna ?? 6;
  const maxFuros = cfg.maxFurosPorColuna ?? 40;

  if (piece.altura <= 500) {
    margemTopo = Math.min(margemTopo, 80);
    margemBase = Math.min(margemBase, 80);
  }

  const zonaUtil = Math.max(0, piece.altura - margemTopo - margemBase);
  const numFurosPorEspacamento = Math.floor(zonaUtil / espacamento) + 1;
  let numFuros = numFurosPorEspacamento;
  if (numFuros > maxFuros) numFuros = maxFuros;
  if (zonaUtil > 0 && numFuros < minFuros) numFuros = Math.min(minFuros, numFurosPorEspacamento);

  const xLeft = recuoBorda;
  const xRight = piece.largura - recuoBorda;

  if (numFuros <= 1) {
    const y = margemTopo + zonaUtil / 2;
    pushHole(out, piece, xLeft, y, diametro, profundidade, "prateleira", face);
    pushHole(out, piece, xRight, y, diametro, profundidade, "prateleira", face);
    return;
  }

  const step = zonaUtil / (numFuros - 1);
  for (let i = 0; i < numFuros; i++) {
    const y = margemTopo + i * step;
    pushHole(out, piece, xLeft, y, diametro, profundidade, "prateleira", face);
    pushHole(out, piece, xRight, y, diametro, profundidade, "prateleira", face);
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
  } catch (err) {
    console.warn(`[drillingService] Error calculating drills for ${piece.tipo}:`, err);
  }
  return out;
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
      furacoesTecnicas,
      furacoes: furacoesTecnicas.map((h) => ({
        x: h.x,
        y: h.y,
        diametro: h.diametro,
        profundidade: h.profundidade,
        tipo: (h.face === "cima" || h.face === "fundo" ? "vertical" : "horizontal") as "vertical" | "horizontal",
      })),
    };
  });
}

export function isTopDrillable(face: DrillFace): boolean {
  return face === "cima" || face === "fundo";
}

export function mapDrillingsToCncOperations(
  holes: TechnicalDrillHole[],
  panelThickness: number
): CncDrillOperation[] {
  return holes
    .filter((h) => isTopDrillable(h.face))
    .map((h) => ({
      x: h.x,
      y: h.y,
      z: 0,
      diametro: h.diametro,
      profundidade: Math.min(h.profundidade, panelThickness),
      tipo: "vertical" as const,
    }));
}
