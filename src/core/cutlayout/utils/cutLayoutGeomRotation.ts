/**
 * Rotação geométrica real para o motor de nesting.
 *
 * Convenção: 90° CCW, confirmada por layoutCoordinateSystem.ts:
 *   holeLocalToSheetOffsetMm → sx = hy, sy = L − hx  (L = largura original da peça)
 *
 * Após rotação de uma peça de (origW × origH) para (origH × origW):
 *   ponto (hx, hy) → (hy, origW − hx)
 */

type DrillHole = {
  x: number;
  y: number;
  diameter: number;
  depth: number;
  holeType?: string;
  topDrillable?: boolean;
};

type InnerContour = {
  x_mm: number;
  y_mm: number;
  largura_mm: number;
  altura_mm: number;
};

type PlacementLike = {
  rotacao: number;
  largura_mm: number;
  altura_mm: number;
  drillHoles?: DrillHole[];
  holes?: DrillHole[];
  originalDrillHoles?: DrillHole[];
  innerContours?: InnerContour[];
};

/**
 * Roda um array de furos 90° CCW dado o largura original da peça.
 *   novo_x = hy
 *   novo_y = origW − hx
 */
export function rotateDrillHoles90CCW(holes: DrillHole[], origW: number): DrillHole[] {
  return holes.map((h) => ({ ...h, x: h.y, y: origW - h.x }));
}

/**
 * Roda um array de innerContours 90° CCW dado o largura original da peça.
 *   x_new     = y_mm
 *   y_new     = origW − x_mm − largura_mm
 *   largura_new = altura_mm
 *   altura_new  = largura_mm
 */
export function rotateInnerContours90CCW(contours: InnerContour[], origW: number): InnerContour[] {
  return contours.map((c) => ({
    x_mm: c.y_mm,
    y_mm: origW - c.x_mm - c.largura_mm,
    largura_mm: c.altura_mm,
    altura_mm: c.largura_mm,
  }));
}

/**
 * Verifica se a geometria da peça permite rotação automática pelo nesting.
 * Retorna false se:
 *  - a peça tem grainDirection (tecido/veio com orientação fixa)
 *  - tem furos com topDrillable=false (operações de face lateral — direcionais)
 */
export function canRotatePieceGeometry(piece: {
  grainDirection?: string;
  drillHoles?: DrillHole[];
  holes?: DrillHole[];
}): boolean {
  if (piece.grainDirection) return false;
  const holes = piece.drillHoles ?? piece.holes ?? [];
  if (holes.some((h) => h.topDrillable === false)) return false;
  return true;
}

/**
 * Pós-processamento geométrico de todas as chapas após runCutLayout.
 *
 * Para cada placement:
 *  1. Garante que originalDrillHoles contém sempre as coords pré-rotação (para PDF).
 *  2. Para rotaco=90: transforma drillHoles e innerContours para o espaço colocado
 *     (para consumidores industriais que leem drillHoles diretamente).
 *
 * Relação de dims após rotação pelo motor:
 *   placed.largura_mm = original altura   → placed.altura_mm = original largura (origW)
 *
 * Seguro chamar múltiplas vezes: idempotente graças ao guarda originalDrillHoles.
 */
export function applyRotationGeometryToSheets(sheets: Array<{ placements: PlacementLike[] }>): void {
  for (const s of sheets) {
    for (const p of s.placements) {
      const rawHoles = p.drillHoles ?? p.holes;

      // Garante backup das coords originais antes de qualquer transformação
      if (!p.originalDrillHoles && rawHoles && rawHoles.length > 0) {
        p.originalDrillHoles = rawHoles.map((h) => ({ ...h }));
      }

      if (p.rotacao !== 90) continue;

      // origW = largura original da peça = placed.altura_mm (motor swapou as dims)
      const origW = p.altura_mm;

      const origHoles = p.originalDrillHoles ?? rawHoles;
      if (origHoles && origHoles.length > 0) {
        const rotatedHoles = rotateDrillHoles90CCW(origHoles, origW);
        p.drillHoles = rotatedHoles;
        if (p.holes !== undefined) p.holes = rotatedHoles;
      }

      if (p.innerContours && p.innerContours.length > 0) {
        p.innerContours = rotateInnerContours90CCW(p.innerContours, origW);
      }
    }
  }
}
