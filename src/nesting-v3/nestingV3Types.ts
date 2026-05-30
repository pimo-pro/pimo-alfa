/**
 * Nesting V3 — Tipos independentes.
 * Módulo totalmente separado do motor industrial.
 * Lê tipos existentes (read-only), nunca os modifica.
 */

// ── Furo associado a uma peça ─────────────────────────────────────────────────

export interface V3Hole {
  /** X relativo ao canto inf-esq da peça (mm). */
  x: number;
  /** Y relativo ao canto inf-esq da peça (mm). */
  y: number;
  diameter: number;
  depth: number;
  holeType?: string;
}

// ── Peça (piece) ──────────────────────────────────────────────────────────────

export interface V3Piece {
  /** ID único dentro desta sessão Nesting V3. */
  id: string;
  name: string;
  /** Largura em mm (dimensão X no estado actual, antes de rotação). */
  widthMm: number;
  /** Altura em mm (dimensão Y no estado actual, antes de rotação). */
  heightMm: number;
  thicknessMm: number;
  materialId?: string;
  materialName?: string;
  /** Furos originais (antes de qualquer rotação). Nunca se alteram. */
  originalHoles: V3Hole[];
  /** Rotação atual: 0, 90, 180, 270. */
  rotation: 0 | 90 | 180 | 270;
  /** Cor de fundo para display 2D. Calculada a partir do material. */
  color: string;
  /** ID da origem (boxId do projeto). Opcional para peças adicionadas manualmente. */
  sourceBoxId?: string;
}

// ── Placement de uma peça num sheet ──────────────────────────────────────────

export interface V3Placement {
  pieceId: string;
  sheetIndex: number;
  /** X do canto sup-esq no sheet (mm). */
  xMm: number;
  /** Y do canto sup-esq no sheet (mm). */
  yMm: number;
}

// ── Sheet (folha de madeira) ───────────────────────────────────────────────────

export interface V3Sheet {
  index: number;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  materialId?: string;
  materialName?: string;
}

// ── Estado completo da sessão V3 ──────────────────────────────────────────────

export interface NestingV3State {
  sheets: V3Sheet[];
  pieces: V3Piece[];
  /** Peças que estão colocadas num sheet. */
  placements: V3Placement[];
  /** Peças na lista lateral (não colocadas em nenhum sheet). */
  unplacedPieceIds: string[];
  /** Folga entre peças (kerf) em mm. */
  kerfMm: number;
  /** Sheet atualmente visível na área central. */
  activeSheetIndex: number;
}

// ── Resultado de auto-layout ──────────────────────────────────────────────────

export interface V3AutoLayoutResult {
  placements: V3Placement[];
  unplacedPieceIds: string[];
  sheetsUsed: number;
}

// ── Dados de drag activo ──────────────────────────────────────────────────────

export interface V3DragState {
  pieceId: string;
  /** Offset do cursor dentro da peça (px). */
  offsetX: number;
  offsetY: number;
  /** Posição actual do cursor na viewport (px). */
  cursorX: number;
  cursorY: number;
  /** De onde vem a peça: "sheet" | "sidebar". */
  source: "sheet" | "sidebar";
  sourcePlacement?: V3Placement;
}
