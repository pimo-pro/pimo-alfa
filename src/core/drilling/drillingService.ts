import type { CncDrillOperation } from "../cnc/cncTypes";
import type { RulesConfig } from "../rules/rulesConfig";
import type { CutListItem, DrillFace, DrillType, TechnicalDrillHole } from "../types";

type PieceType =
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

function calcCavilha(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  if (!rules?.furos?.tecnicos?.cavilha) return;
  const cfg = rules.furos.tecnicos.cavilha;
  if (!cfg.enabled) return;
  const face = getInternalFace(piece.tipo);
  const xLeft = cfg.distanciaLateral + cfg.offsetLateral;
  const xRight = piece.largura - cfg.distanciaLateral - cfg.offsetLateral;
  const yFront = cfg.distanciaFrente;
  const yBack = piece.altura - cfg.distanciaFundo;
  if (
    (piece.tipo === "cima" && cfg.aplicarEm.cima) ||
    (piece.tipo === "fundo" && cfg.aplicarEm.fundo)
  ) {
    pushHole(out, piece, xLeft, yFront, cfg.diametro, cfg.profundidade, "cavilha", face);
    pushHole(out, piece, xLeft, yBack, cfg.diametro, cfg.profundidade, "cavilha", face);
    pushHole(out, piece, xRight, yFront, cfg.diametro, cfg.profundidade, "cavilha", face);
    pushHole(out, piece, xRight, yBack, cfg.diametro, cfg.profundidade, "cavilha", face);
  }
  if (
    (piece.tipo === "lateral_esquerda" && cfg.aplicarEm.lateralEsquerda) ||
    (piece.tipo === "lateral_direita" && cfg.aplicarEm.lateralDireita)
  ) {
    const yTop = cfg.distanciaTopo;
    const yBottom = piece.altura - cfg.distanciaBase;
    pushHole(out, piece, yFront, yTop, cfg.diametro, cfg.profundidade, "cavilha", face);
    pushHole(out, piece, yBack, yTop, cfg.diametro, cfg.profundidade, "cavilha", face);
    pushHole(out, piece, yFront, yBottom, cfg.diametro, cfg.profundidade, "cavilha", face);
    pushHole(out, piece, yBack, yBottom, cfg.diametro, cfg.profundidade, "cavilha", face);
  }
}

function calcParafuso(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  if (!rules?.furos?.tecnicos?.parafuso) return;
  const cfg = rules.furos.tecnicos.parafuso;
  if (!cfg.enabled) return;
  if (
    (piece.tipo === "cima" && !cfg.aplicarEm.cima) ||
    (piece.tipo === "fundo" && !cfg.aplicarEm.fundo)
  ) return;
  if (piece.tipo !== "cima" && piece.tipo !== "fundo") return;
  const face = getInternalFace(piece.tipo);
  const xLeft = cfg.distanciaLateral + cfg.offsetDaCavilha;
  const xRight = piece.largura - cfg.distanciaLateral - cfg.offsetDaCavilha;
  const yFront = cfg.distanciaFrente;
  const yBack = piece.altura - cfg.distanciaFundo;
  const depth = cfg.profundidadeIgualEspessura ? piece.espessura : cfg.profundidade;
  pushHole(out, piece, xLeft, yFront, cfg.diametro, depth, "parafuso", face);
  pushHole(out, piece, xLeft, yBack, cfg.diametro, depth, "parafuso", face);
  pushHole(out, piece, xRight, yFront, cfg.diametro, depth, "parafuso", face);
  pushHole(out, piece, xRight, yBack, cfg.diametro, depth, "parafuso", face);
}

function calcDobradica(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  if (!rules?.furos?.tecnicos?.dobradica) return;
  const cfg = rules.furos.tecnicos.dobradica;
  if (!cfg.enabled) return;
  if (!piece.tipo.startsWith("porta")) return;
  const face: DrillFace = "tras";
  const x = piece.largura - cfg.distanciaBordaLateral;
  let offsets = cfg.offsetsVerticaisMm.length > 0
    ? cfg.offsetsVerticaisMm
    : [cfg.offsetSuperior, piece.altura - cfg.offsetInferior];
  if (cfg.numeroPorPorta > 0 && offsets.length > cfg.numeroPorPorta) {
    offsets = offsets.slice(0, cfg.numeroPorPorta);
  }
  for (const oy of offsets) {
    pushHole(out, piece, x, oy, cfg.diametro, cfg.profundidade, "dobradica", face);
  }
}

function calcCorredica(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  if (!rules?.furos?.tecnicos?.corredica) return;
  const cfg = rules.furos.tecnicos.corredica;
  if (!cfg.enabled) return;
  const isDrawerSide = piece.tipo === "gaveta_lat_esq" || piece.tipo === "gaveta_lat_dir" || piece.tipo === "gaveta";
  const isCabinetSide = piece.tipo === "lateral_esquerda" || piece.tipo === "lateral_direita";
  if (!isDrawerSide && !isCabinetSide) return;
  const face = piece.tipo === "lateral_esquerda" ? "direita" : piece.tipo === "lateral_direita" ? "esquerda" : "frente";
  const y = cfg.alturaRelativaFundo + cfg.offsetVerticalAdicional;
  const xFront = cfg.offsetFrente;
  const xBack = piece.largura - cfg.offsetFundo;
  pushHole(out, piece, xFront, y, cfg.diametro, cfg.profundidade, "corredica", face);
  pushHole(out, piece, xBack, y, cfg.diametro, cfg.profundidade, "corredica", face);
}

function calcPrateleiraLine(piece: PieceInput, rules: RulesConfig, out: TechnicalDrillHole[]) {
  if (!rules?.furos?.tecnicos?.prateleira) return;
  const cfg = rules.furos.tecnicos.prateleira;
  if (!cfg.enabled) return;
  if (piece.tipo !== "lateral_esquerda" && piece.tipo !== "lateral_direita") return;
  const face = piece.tipo === "lateral_esquerda" ? "direita" : "esquerda";
  const x = cfg.recuoBorda;
  if (cfg.numeroFurosPorColuna > 0) {
    const usable = Math.max(0, piece.altura - cfg.margemTopo - cfg.margemBase);
    const step = cfg.numeroFurosPorColuna <= 1 ? 0 : usable / (cfg.numeroFurosPorColuna - 1);
    for (let i = 0; i < cfg.numeroFurosPorColuna; i++) {
      const y = cfg.margemTopo + i * step;
      pushHole(out, piece, x, y, cfg.diametro, cfg.profundidade, "prateleira", face);
    }
  } else {
    let y = cfg.margemTopo;
    while (y <= piece.altura - cfg.margemBase) {
      pushHole(out, piece, x, y, cfg.diametro, cfg.profundidade, "prateleira", face);
      y += cfg.espacamento;
    }
  }
}

export function calculateTechnicalDrillingsForPiece(piece: PieceInput, rules: RulesConfig): TechnicalDrillHole[] {
  const out: TechnicalDrillHole[] = [];
  if (!piece || !piece.tipo || !Number.isFinite(piece.largura) || !Number.isFinite(piece.altura)) return out;
  if (!rules || !rules.furos) return out;
  try {
    calcCavilha(piece, rules, out);
    calcParafuso(piece, rules, out);
    calcDobradica(piece, rules, out);
    calcCorredica(piece, rules, out);
    calcPrateleiraLine(piece, rules, out);
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
        tipo: h.face === "cima" || h.face === "fundo" ? "vertical" : "horizontal",
      })),
    };
  });
}

export function mapDrillingsToCncOperations(
  holes: TechnicalDrillHole[],
  panelThickness: number
): CncDrillOperation[] {
  return holes.map((h) => ({
    x: h.x,
    y: h.y,
    z: 0,
    diametro: h.diametro,
    profundidade: Math.min(h.profundidade, panelThickness),
    tipo: h.face === "cima" || h.face === "fundo" ? "vertical" : "horizontal",
  }));
}
