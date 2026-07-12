/** Borda de referência para posição do divisório vertical (mm a partir da lateral). */
export type DivisorReferenceEdge = "left" | "right";

/** Borda de referência para posição do separador horizontal (mm a partir do topo ou fundo). */
export type SeparadorReferenceEdge = "top" | "bottom";

/** Lado do compartimento onde as prateleiras são colocadas em relação ao DIV. */
export type DivisorPrateleiraLado = "esquerda" | "direita";

/** Divisório vertical (DIV) — peça interna da caixa. */
export interface DivisorItem {
  id: string;
  /** Posição em mm a partir da lateral de referência (centro da peça). */
  positionMm: number;
  referenceEdge: DivisorReferenceEdge;
  /** Altura (mm). Omitido = altura interna útil ou altura acoplada ao SEP. */
  alturaMm?: number;
  /** Profundidade (mm). Omitido = profundidade interna − folga frontal. */
  profundidadeMm?: number;
  /** ID do separador ao qual este DIV termina (ligação explícita SEP+DIV). */
  linkedSeparadorId?: string;
  /** Lado do compartimento com furos de prateleira quando há prateleiras no módulo. */
  prateleiraLado?: DivisorPrateleiraLado;
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
  drawersLayer?: readonly { frontThickness?: number }[];
  gavetas?: number;
  costaAtiva?: boolean;
  prateleiras?: number;
  divisores?: DivisorItem[];
  separadores?: SeparadorItem[];
};
