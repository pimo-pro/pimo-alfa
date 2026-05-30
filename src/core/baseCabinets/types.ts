/**
 * Modelo base de armário (Base Cabinet).
 * Cada caixa é criada como uma unidade individual a partir de um destes modelos.
 * O modelo é simples; regras de espessura, costa, pés e montagem são aplicadas pelo sistema.
 */

export interface BaseCabinetModel {
  id: string;
  nome: string;
  /** Largura em mm. */
  widthMm: number;
  /** Altura em mm (base: 720; garravera pode ser 800). */
  heightMm: number;
  /** Profundidade em mm. */
  depthMm: number;
  /** Número de portas (0 = aberto/garravera). */
  doors: number;
  /** Número de prateleiras internas. */
  shelves: number;
  /** Número de gavetas. */
  drawers: number;
  /** Divisor vertical (ex.: 1200mm 3 portas). */
  verticalDivider?: boolean;
  /** Canto direito (L). */
  cornerRight?: boolean;
  /** Canto esquerdo (L). */
  cornerLeft?: boolean;
  /** Canto com frente fixa + porta única (motor dedicado). */
  cornerFixedFront?: boolean;
  /** Estilo visual/paramétrico do canto. */
  cornerStyle?: "cozinha" | "roupeiro";
  /** Lado padrão da frente fixa (invertível com rotação 180°). */
  cornerDefaultSide?: "left" | "right";
  /** Subcategoria no catálogo Móveis (UI). */
  subcategoriaCatalogo?: string;
  /** Grupo organizacional do catalogo (somente UI). */
  grupoCatalogo?: "br" | "pt" | "pi";
  /** Categoria para filtro na UI. */
  categoria: "base" | "upper";
}

export type PortaTipoFromModel = "sem_porta" | "porta_simples" | "porta_dupla";

/** Converte modelo base para portaTipo do WorkspaceBox. */
export function modelToPortaTipo(doors: number): PortaTipoFromModel {
  if (doors <= 0) return "sem_porta";
  if (doors === 1) return "porta_simples";
  return "porta_dupla";
}
