/** Borda de referência para posição do divisório vertical (mm a partir da lateral). */
export type DivisorReferenceEdge = "left" | "right";

/** Borda de referência para posição do separador horizontal (mm a partir do topo ou fundo). */
export type SeparadorReferenceEdge = "top" | "bottom";

/** Divisório vertical (DIV) — peça interna da caixa. */
export interface DivisorItem {
  id: string;
  /** Posição em mm a partir da lateral de referência (centro da peça). */
  positionMm: number;
  referenceEdge: DivisorReferenceEdge;
  /** Altura (mm). Omitido = altura interna útil. */
  alturaMm?: number;
  /** Profundidade (mm). Omitido = profundidade interna − folga frontal. */
  profundidadeMm?: number;
}

/** Separador horizontal (SEP) — peça interna da caixa. */
export interface SeparadorItem {
  id: string;
  /** Posição em mm a partir do topo ou fundo (centro da peça). */
  positionMm: number;
  referenceEdge: SeparadorReferenceEdge;
  /** Largura (mm). Omitido = largura interna − folgas. */
  larguraMm?: number;
  /** Profundidade (mm). Omitido = profundidade interna − folga frontal. */
  profundidadeMm?: number;
}

export type DivSepBoxLike = {
  dimensoes: { largura: number; altura: number; profundidade?: number };
  espessura: number;
  profundidadeExterna?: number;
  portaTipo?: string;
  doorsLayer?: unknown[];
  costaAtiva?: boolean;
  divisores?: DivisorItem[];
  separadores?: SeparadorItem[];
};
