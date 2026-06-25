/**
 * Rotação geométrica real para o motor de nesting.
 *
 * Convenção: 90° CCW, alinhada a layoutCoordinateSystem.holeLocalToSheetOffsetMm:
 *   sx = hy, sy = H − hx  (H = altura da peça no referencial do furo)
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
  rotation?: number;
  rotacao?: number;
  angle?: number;
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

const rotatedContourPlacements = new WeakSet<PlacementLike>();

function normalizeRotation(rotacao: number): 0 | 90 | 180 | 270 {
  const r = ((Math.round(rotacao) % 360) + 360) % 360;
  if (r === 90 || r === 180 || r === 270) return r;
  return 0;
}

function addRotation<T extends DrillHole>(op: T, angle: 0 | 90 | 180 | 270): T {
  if (angle === 0) return op;
  const next = { ...op };
  if (typeof next.rotation === "number") next.rotation = (next.rotation + angle) % 360;
  if (typeof next.rotacao === "number") next.rotacao = (next.rotacao + angle) % 360;
  if (typeof next.angle === "number") next.angle = (next.angle + angle) % 360;
  return next;
}

/**
 * Roda um array de furos 90° CCW dado o largura original da peça.
 *   novo_x = hy
 *   novo_y = origW − hx
 */
export function rotateDrillHoles90CCW(holes: DrillHole[], origW: number): DrillHole[] {
  return rotateDrillHoles(holes, 90, origW, 0);
}

export function rotateDrillHoles(
  holes: DrillHole[],
  angle: 0 | 90 | 180 | 270,
  origW: number,
  origH: number
): DrillHole[] {
  if (angle === 0) return holes.map((h) => ({ ...h }));
  return holes.map((h) => {
    if (angle === 90) return addRotation({ ...h, x: h.y, y: origW - h.x }, angle);
    if (angle === 180) return addRotation({ ...h, x: origW - h.x, y: origH - h.y }, angle);
    return addRotation({ ...h, x: origH - h.y, y: h.x }, angle);
  });
}

/**
 * Roda um array de innerContours 90° CCW dado o largura original da peça.
 *   x_new     = y_mm
 *   y_new     = origW − x_mm − largura_mm
 *   largura_new = altura_mm
 *   altura_new  = largura_mm
 */
export function rotateInnerContours90CCW(contours: InnerContour[], origW: number): InnerContour[] {
  return rotateInnerContours(contours, 90, origW, 0);
}

export function rotateInnerContours(
  contours: InnerContour[],
  angle: 0 | 90 | 180 | 270,
  origW: number,
  origH: number
): InnerContour[] {
  if (angle === 0) return contours.map((c) => ({ ...c }));
  return contours.map((c) => {
    if (angle === 90) {
      return {
        x_mm: c.y_mm,
        y_mm: origW - c.x_mm - c.largura_mm,
        largura_mm: c.altura_mm,
        altura_mm: c.largura_mm,
      };
    }
    if (angle === 180) {
      return {
        x_mm: origW - c.x_mm - c.largura_mm,
        y_mm: origH - c.y_mm - c.altura_mm,
        largura_mm: c.largura_mm,
        altura_mm: c.altura_mm,
      };
    }
    return {
      x_mm: origH - c.y_mm - c.altura_mm,
      y_mm: c.x_mm,
      largura_mm: c.altura_mm,
      altura_mm: c.largura_mm,
    };
  });
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
 *  2. Para rotacao=90/180/270: transforma drillHoles e innerContours para o espaço colocado
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

      const rotation = normalizeRotation(p.rotacao);
      if (rotation === 0) continue;

      const swapsDims = rotation === 90 || rotation === 270;
      const origW = swapsDims ? p.altura_mm : p.largura_mm;
      const origH = swapsDims ? p.largura_mm : p.altura_mm;

      const origHoles = p.originalDrillHoles ?? rawHoles;
      if (origHoles && origHoles.length > 0) {
        const rotatedHoles = rotateDrillHoles(origHoles, rotation, origW, origH);
        p.drillHoles = rotatedHoles;
        if (p.holes !== undefined) p.holes = rotatedHoles;
      }

      if (p.innerContours && p.innerContours.length > 0 && !rotatedContourPlacements.has(p)) {
        p.innerContours = rotateInnerContours(p.innerContours, rotation, origW, origH);
        rotatedContourPlacements.add(p);
      }
    }
  }
}
