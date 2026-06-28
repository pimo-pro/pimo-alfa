/** Referência industrial partilhada entre PROJETOS, etiquetas e PIMO-TRAK. */
export type ProjetosIndustrialRef = {
  projectId: string;
  projectName: string;
  projectPageSlug: string;
  boxId?: string;
  boxSlug?: string;
  pieceId?: string;
  pieceSlug?: string;
  /** Código de etiqueta industrial (NQR…). */
  etiquetaCode?: string | null;
  qrPayload?: string | null;
};

export const PROJETOS_PIECE_OPERATIONS = [
  { id: "nesting", label: "NISTING" },
  { id: "manual", label: "MANUAL" },
  { id: "cnc", label: "CNC" },
  { id: "drill", label: "DRILL" },
  { id: "orlar", label: "ORLAR" },
  { id: "montagem", label: "MONTAGEM" },
  { id: "embalagem", label: "EMBALAGEM" },
  { id: "limpeza", label: "LIMPEZAS" },
] as const;

export type ProjetosPieceOperationId = (typeof PROJETOS_PIECE_OPERATIONS)[number]["id"];
