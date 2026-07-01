export type IndustrialPieceDimensionEdit = {
  /** Largura (mm) */
  largura?: number;
  /** Comprimento / altura na lista (mm) */
  altura?: number;
  /** Espessura (mm) */
  espessura?: number;
};

export type IndustrialPieceEdit = IndustrialPieceDimensionEdit & {
  /** Caixa de destino após mover */
  boxId?: string;
  /** Peça removida do fluxo industrial */
  deleted?: boolean;
  editedAt?: string;
};

export type IndustrialPieceEditsStore = Record<string, IndustrialPieceEdit>;

export type IndustrialOperationId =
  | "NESTING"
  | "CNC"
  | "DRILL"
  | "ORLAR"
  | "MONTAGEM"
  | "EMBALAGEM";

export const INDUSTRIAL_OPERATION_IDS: readonly IndustrialOperationId[] = [
  "NESTING",
  "CNC",
  "DRILL",
  "ORLAR",
  "MONTAGEM",
  "EMBALAGEM",
] as const;

export const INDUSTRIAL_OPERATION_LABELS: Record<IndustrialOperationId, string> = {
  NESTING: "Nesting",
  CNC: "CNC",
  DRILL: "Drill",
  ORLAR: "Orlar",
  MONTAGEM: "Montagem",
  EMBALAGEM: "Embalagem",
};

export type IndustrialOperacaoState = {
  completedAt?: string;
  employeeId?: string;
  employeeName?: string;
  notas?: string;
};

export type IndustrialOperacoesStore = Partial<Record<IndustrialOperationId, IndustrialOperacaoState>>;
