/**
 * materialCost.ts — Custo de materiais (cutlist + metadata, somente leitura).
 */

export type MaterialPriceTable = Record<string, number>;

export type MaterialCostConfig = {
  /** Preço €/m² por material (canonical id). */
  pricePerSqm: MaterialPriceTable;
  /** Fallback €/m² se material desconhecido. */
  defaultPricePerSqm: number;
  /** Multiplicador de desperdício (ex.: 1.15 = +15%). */
  wasteFactor: number;
};

export type MaterialPieceCost = {
  pieceCode: string;
  nome: string;
  material: string;
  areaM2: number;
  qty: number;
  pricePerSqm: number;
  cost: number;
};

export type MaterialCostBreakdown = {
  pieces: MaterialPieceCost[];
  totalAreaM2: number;
  totalWoodCost: number;
  wasteFactor: number;
};

export type CutlistLikeItem = {
  codigo?: string;
  nome: string;
  quantidade: number;
  larguraMm: number;
  alturaMm: number;
  profundidadeMm: number;
  espessuraMm: number;
  material: string;
  kind: string;
};

export const DEFAULT_MATERIAL_COST_CONFIG: MaterialCostConfig = {
  pricePerSqm: {
    mdf_branco: 28,
    mdf_cru: 22,
    hdf_cru: 20,
    carvalho: 55,
    aglomerado: 18,
    default: 25,
  },
  defaultPricePerSqm: 25,
  wasteFactor: 1.12,
};

function pieceFaceAreaM2(item: CutlistLikeItem): number {
  // Face principal aproximada: max das faces (largura×altura, largura×prof, altura×prof)
  const a = (item.larguraMm * item.alturaMm) / 1_000_000;
  const b = (item.larguraMm * item.profundidadeMm) / 1_000_000;
  const c = (item.alturaMm * item.profundidadeMm) / 1_000_000;
  return Math.max(a, b, c, 0);
}

function resolvePrice(material: string, cfg: MaterialCostConfig): number {
  const key = (material || "").trim().toLowerCase();
  if (cfg.pricePerSqm[key] != null) return cfg.pricePerSqm[key];
  if (key.includes("carvalho")) return cfg.pricePerSqm.carvalho ?? cfg.defaultPricePerSqm;
  if (key.includes("hdf")) return cfg.pricePerSqm.hdf_cru ?? cfg.defaultPricePerSqm;
  if (key.includes("mdf")) return cfg.pricePerSqm.mdf_branco ?? cfg.defaultPricePerSqm;
  return cfg.defaultPricePerSqm;
}

/**
 * Calcula custo de madeira a partir da cutlist (peças kind=wood).
 */
export function calculateMaterialCost(
  cutlist: CutlistLikeItem[],
  config: MaterialCostConfig = DEFAULT_MATERIAL_COST_CONFIG
): MaterialCostBreakdown {
  const wood = cutlist.filter((i) => i.kind === "wood");
  const pieces: MaterialPieceCost[] = wood.map((item) => {
    const areaM2 = pieceFaceAreaM2(item) * Math.max(1, item.quantidade);
    const pricePerSqm = resolvePrice(item.material, config);
    const cost = round2(areaM2 * pricePerSqm * config.wasteFactor);
    return {
      pieceCode: item.codigo || item.nome,
      nome: item.nome,
      material: item.material,
      areaM2: round4(areaM2),
      qty: item.quantidade,
      pricePerSqm,
      cost,
    };
  });

  const totalAreaM2 = round4(pieces.reduce((s, p) => s + p.areaM2, 0));
  const totalWoodCost = round2(pieces.reduce((s, p) => s + p.cost, 0));

  return {
    pieces,
    totalAreaM2,
    totalWoodCost,
    wasteFactor: config.wasteFactor,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
