/**
 * Tipos da Workspace Industrial de Design de Modelos.
 */

import type { HoleFaceKind, HoleTypeId } from "../drill/holeCatalog";
import type { DrillFace } from "../types";

/** Tipo de recorte opcional em painéis do módulo industrial. */
export type DesignPanelCutoutKind =
  | "recorte_traseiro"
  | "recorte_inferior_rodape"
  | "recorte_superior_iluminacao"
  | "recorte_prateleira_canto"
  | "recorte_traseiro_L";

export interface DesignPanelCutout {
  id: string;
  kind: DesignPanelCutoutKind;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

/** Tipo estrutural do painel no modelo em design. */
export type DesignPanelTipo =
  | "cima"
  | "fundo"
  | "lateral"
  | "frente"
  | "frente_fixa"
  | "costa"
  | "prateleira"
  | "divisoria"
  | "gaveta_lat_esq"
  | "gaveta_lat_dir"
  | "gaveta_fundo"
  | "gaveta_frente_ext"
  | "gaveta_frente_int"
  | "gaveta_traseira";

/** Furo colocado manualmente na Workspace de Design. */
export interface DesignDrillHole {
  id: string;
  holeTypeId: HoleTypeId;
  xMm: number;
  yMm: number;
  face: HoleFaceKind;
  /** Face geométrica real (peças de gaveta multi-face). */
  drillFace?: DrillFace;
  /** ID do furo gerado automaticamente na peça oposta (encaixe cavilha). */
  pairedHoleId?: string;
  /** Ferragem física associada ao par (CAVILHA_10x40). */
  ferragemId?: string;
}

/** Tipo de constraint entre painéis. */
export type PanelConstraintTipo =
  | "encaixe_cavilha"
  | "encaixe_prateleira"
  | "encaixe_dobradica"
  | "adjacente";

/** Ligação entre duas peças para regras de encaixe automático. */
export interface PanelConstraint {
  id: string;
  panelAId: string;
  panelBId: string;
  tipo: PanelConstraintTipo;
}

/** Painel editável na Workspace de Design. */
export interface DesignPanel {
  id: string;
  tipo: DesignPanelTipo;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  materialId: string;
  drillHoles: DesignDrillHole[];
  /** Recortes opcionais (costa / rodapé / iluminação). */
  cutouts?: DesignPanelCutout[];
  /** Posição relativa ao interior da caixa (mm a partir do canto inferior-esquerdo-frente). */
  positionMm?: { x: number; y: number; z: number };
}

/** Caixa completa em modo design industrial. */
export interface IndustrialDesignBox {
  id: string;
  nome: string;
  /** Dimensões externas da caixa (mm). */
  outerWidthMm: number;
  outerHeightMm: number;
  outerDepthMm: number;
  espessuraMm: number;
  materialId: string;
  panels: DesignPanel[];
  constraints: PanelConstraint[];
  /** false = módulo industrial built-in (catálogo); true/omitido = criado na Workspace. */
  designWorkspace?: boolean;
}

export type IndustrialDesignWorkspaceState = {
  enabled: boolean;
  activeHoleTypeId: HoleTypeId | null;
  selectedPanelId: string | null;
  designBox: IndustrialDesignBox | null;
};
