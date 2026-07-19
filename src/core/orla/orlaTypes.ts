/** Lados de orla por peça (V1). */
export type OrlaSideId = "front" | "back" | "left" | "right";

export type OrlaMaterialTipo = "PVC" | "ABS" | "MELAMINA" | "OUTRO";

/** Preset de material de orla (catálogo do projeto). */
export type OrlaPreset = {
  id: string;
  nome: string;
  tipo: OrlaMaterialTipo;
  espessuraMm: number;
  larguraMm: number;
  cor: string;
  texturaUrl?: string;
  precoPorMetro: number;
  precoPorM2?: number;
};

export type OrlaSideConfig = {
  presetId: string | null;
  enabled: boolean;
};

export type PieceOrlaConfig = {
  /** front/back/left/right */
  sides: Record<OrlaSideId, OrlaSideConfig>;
  /** IDs de peças adjacentes com orla partilhada (Orla Junto). */
  orlaJunto?: string[];
  /** Material da chapa desta peca (SSOT PDF — nao usar materia da caixa). */
  orlaMaterialId?: string | null;
  /** Label da chapa sem espessura (coluna Material no PDF). */
  orlaMaterialLabel?: string | null;
};

export type OrlaJuntoPair = {
  id: string;
  pieceAId: string;
  sideA: OrlaSideId;
  pieceBId: string;
  sideB: OrlaSideId;
};

/** Linha agregada para ferragem / listagem. */
export type OrlaFerragemLine = {
  id: string;
  presetId: string;
  presetNome: string;
  metros: number;
  custo: number;
  boxId?: string;
  boxNome?: string;
  pieceId?: string;
  pieceNome?: string;
  /** Material da peca (chapa), nao da caixa. */
  orlaMaterialId?: string;
  orlaMaterialLabel?: string;
  tipo: "normal" | "orla_junto";
};

export type ProjectFerragemOrla = {
  linhas: OrlaFerragemLine[];
  metrosTotal: number;
  custoTotal: number;
  porBox: Record<string, { metros: number; custo: number }>;
};

export const ORLA_SIDES: OrlaSideId[] = ["front", "back", "left", "right"];

export const EMPTY_ORLA_SIDES = (): Record<OrlaSideId, OrlaSideConfig> => ({
  front: { presetId: null, enabled: false },
  back: { presetId: null, enabled: false },
  left: { presetId: null, enabled: false },
  right: { presetId: null, enabled: false },
});
