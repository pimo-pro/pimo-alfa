export type RematePieceTipo =
  | "DIR"
  | "ESQ"
  | "CIMA"
  | "BAIXO"
  | "L"
  | "RODAPE"
  | "RODAPE_L";

export type RematePiecePosition = {
  xMm: number;
  yMm: number;
  zMm: number;
};

export type RematePieceRotation = {
  xRad: number;
  yRad: number;
  zRad: number;
};

/** Remate 2.0 — peça independente manipulável no viewer e na produção. */
export type RematePiece = {
  id: string;
  parentBoxId?: string;
  tipo: RematePieceTipo;
  width: number;
  height: number;
  depth: number;
  materialPresetId: string;
  position: RematePiecePosition;
  rotation: RematePieceRotation;
  followBox: boolean;
  name: string;
  /** Agrupa peças L / RODAPE_L. */
  parentGroupId?: string;
  partIndex?: 1 | 2;
};

export type CreateRematePieceInput = {
  tipo: RematePieceTipo;
  parentBoxId?: string;
  materialPresetId?: string;
  width?: number;
  height?: number;
  depth?: number;
  followBox?: boolean;
  /** Posição workspace absoluta (mm) quando standalone. */
  workspacePosition?: RematePiecePosition;
};

export type UpdateRematePieceInput = Partial<
  Pick<
    RematePiece,
    | "tipo"
    | "parentBoxId"
    | "width"
    | "height"
    | "depth"
    | "materialPresetId"
    | "position"
    | "rotation"
    | "followBox"
    | "name"
  >
>;

export const REMATE_PIECE_TIPO_LABELS: Record<RematePieceTipo, string> = {
  DIR: "Remate Direito",
  ESQ: "Remate Esquerdo",
  CIMA: "Remate Cima",
  BAIXO: "Remate Baixo",
  L: "Remate L",
  RODAPE: "Rodapé",
  RODAPE_L: "Rodapé L",
};

export function isMultiPartRemateTipo(tipo: RematePieceTipo): boolean {
  return tipo === "L" || tipo === "RODAPE_L";
}
