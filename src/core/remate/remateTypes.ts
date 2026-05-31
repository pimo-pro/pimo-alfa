export type {
  RematePiece,
  RematePieceTipo,
  RematePiecePosition,
  RematePieceRotation,
  CreateRematePieceInput,
  UpdateRematePieceInput,
} from "./rematePieceTypes";
export { REMATE_PIECE_TIPO_LABELS, isMultiPartRemateTipo } from "./rematePieceTypes";

/** @deprecated Remate V1 — migrado automaticamente para RematePiece. */
export type RemateType = "completo" | "avista" | "L" | "rodape";

export type RematePosition = "dir" | "esq" | "cima" | "baixo" | "rodape";

/** Tipo exibido no painel de componentes. */
export type RemateFaceKind = "DIR" | "ESQ" | "CIMA" | "BAIXO" | "L";

export type RemateMaterialMode = "box" | "door" | "aluminio" | "custom";

export type RemateDimensions = {
  widthMm: number;
  heightMm: number;
  depthMm: number;
};

export type RemateTransform = {
  xMm?: number;
  yMm?: number;
  zMm?: number;
  rotacaoXRad?: number;
  rotacaoYRad?: number;
  rotacaoZRad?: number;
};

export type ProjectRemate = {
  id: string;
  parentBoxId: string;
  type: RemateType;
  position: RematePosition;
  /** Classificação para UI / componentes (DIR, ESQ, … ou L). */
  faceKind: RemateFaceKind | "RODAPE";
  materialId: string;
  materialMode?: RemateMaterialMode;
  thicknessMm: number;
  dimensions: RemateDimensions;
  name: string;
  transform?: RemateTransform;
  /** Após o utilizador mover/rodar, não reposicionar automaticamente no sync. */
  placementFree?: boolean;
  /** Agrupa as duas peças do remate L. */
  parentGroupId?: string;
  /** 1 ou 2 para remate L. */
  partIndex?: 1 | 2;
  /** ID de grupo visual para merge (apenas viewer). */
  mergedVisualGroupId?: string;
};

export const RODAPE_MAX_LENGTH_MM = 2850;

export type CreateRemateInput = {
  type: RemateType;
  position: RematePosition;
  materialId?: string;
  materialMode?: RemateMaterialMode;
  /** Box alvo; se omitido, usa o box selecionado no workspace. */
  parentBoxId?: string;
};

export type UpdateRemateInput = Partial<
  Pick<
    ProjectRemate,
    | "materialId"
    | "materialMode"
    | "thicknessMm"
    | "dimensions"
    | "transform"
    | "placementFree"
    | "parentBoxId"
  >
>;

export function positionToFaceKind(position: RematePosition, type: RemateType): RemateFaceKind | "RODAPE" {
  if (type === "L") return "L";
  if (position === "rodape" || type === "rodape") return "RODAPE";
  if (position === "dir") return "DIR";
  if (position === "esq") return "ESQ";
  if (position === "cima") return "CIMA";
  return "BAIXO";
}

export function faceKindLabel(kind: RemateFaceKind | "RODAPE"): string {
  if (kind === "RODAPE") return "Roda pé";
  if (kind === "L") return "Remate L";
  return `Remate ${kind}`;
}
