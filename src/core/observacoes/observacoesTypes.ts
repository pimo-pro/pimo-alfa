import type { CutListItem } from "../types";

/** Mapa global de observações por peça (chave = panelId estável ou id industrial). */
export type PieceObservacoesStore = Record<string, string[]>;

export type IndustrialPieceCategory =
  | "painel"
  | "porta"
  | "gaveta"
  | "remate"
  | "rodape"
  | "sep"
  | "div"
  | "outro";

/** Entrada unificada para UI / viewer / listas de peças do box. */
export type IndustrialPieceEntry = {
  pieceId: string;
  nome: string;
  tipo: string;
  categoria: IndustrialPieceCategory;
  industrialRef?: string;
};

export type ObservacoesCollectionContext = {
  pieceObservacoes?: PieceObservacoesStore;
};

export type CutListItemWithObs = CutListItem & {
  observacoes?: string[];
};
