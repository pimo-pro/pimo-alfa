import { computeTightnessScore } from "../scoring/rotationScoring";
import type { CutPiece, SheetDefinition } from "../cutLayoutTypes";

const EPS = 0.001;

type FreeRect = { x: number; y: number; w: number; h: number };
type PlacementCandidate = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  orientationScore: number;
  rotationDelta: number;
  alternativeRotationAvailable: boolean;
  tightnessScore: number;
};
type RotationScoringConfig = {
  rotationWeight: number;
  rotationPenalty: number;
  rotationPreferenceMode: "auto" | "aggressive" | "disabled";
};

export function splitGuillotineRect(rect: FreeRect, w: number, h: number, kerf: number): FreeRect[] {
  const rightW = rect.w - w - kerf;
  const topH = rect.h - h - kerf;
  const result: FreeRect[] = [];
  if (rightW > EPS) result.push({ x: rect.x + w + kerf, y: rect.y, w: rightW, h });
  if (topH > EPS) result.push({ x: rect.x, y: rect.y + h + kerf, w: rect.w, h: topH });
  if (rightW > EPS && topH > EPS) result.push({ x: rect.x + w + kerf, y: rect.y + h + kerf, w: rightW, h: topH });
  return result;
}

export function pruneContainedFreeRects(rects: FreeRect[]): FreeRect[] {
  return rects.filter((r, _i) => {
    for (let j = 0; j < rects.length; j++) {
      if (_i === j) continue;
      const o = rects[j];
      if (r.x >= o.x && r.y >= o.y && r.x + r.w <= o.x + o.w && r.y + r.h <= o.y + o.h) return false;
    }
    return true;
  });
}

export function findPlacementGuillotine(
  piece: CutPiece,
  sheet: SheetDefinition,
  placed: Array<{ x: number; y: number; w: number; h: number }>,
  state: { freeRects: FreeRect[] },
  kerf: number,
  cfg: RotationScoringConfig,
  bin: "firstFit" | "bestFit",
  deps: {
    getOrientations: (_piece: CutPiece, _cfg: RotationScoringConfig) => Array<{ w: number; h: number; rotation: number }>;
    scoreOrientationFit: (_candidate: { x: number; y: number; w: number; h: number }, _sheet: SheetDefinition) => number;
    pickBestCandidateByRotation: (_candidates: PlacementCandidate[], _rotation: 0 | 90) => PlacementCandidate | null;
    chooseOrientationWithRotationBias: (_normal: PlacementCandidate | null, _rotated: PlacementCandidate | null, _cfg: RotationScoringConfig) => PlacementCandidate | null;
  }
): PlacementCandidate | null {
  const candidates: PlacementCandidate[] = [];
  const orientations = deps.getOrientations(piece, cfg);
  // Ordena free rects por área crescente (best-fit): prefere o rect mais apertado para a peça
  const orderedFreeRects = [...state.freeRects].sort((a, b) => a.w * a.h - b.w * b.h || a.y - b.y || a.x - b.x);
  for (const o of orientations) {
    for (const fr of orderedFreeRects) {
      if (o.w > fr.w + EPS || o.h > fr.h + EPS) continue;
      const x = fr.x;
      const y = fr.y;
      candidates.push({
        x,
        y,
        w: o.w,
        h: o.h,
        rotation: o.rotation,
        orientationScore: deps.scoreOrientationFit({ x, y, w: o.w, h: o.h }, sheet),
        tightnessScore: computeTightnessScore(x, y, o.w, o.h, sheet, placed, kerf),
        rotationDelta: 0,
        alternativeRotationAvailable: false,
      });
    }
  }
  if (candidates.length === 0) return null;
  if (bin === "firstFit") {
    const normal = deps.pickBestCandidateByRotation(candidates, 0);
    const rotated = deps.pickBestCandidateByRotation(candidates, 90);
    return deps.chooseOrientationWithRotationBias(normal, rotated, cfg);
  }
  return candidates.sort((a, b) => {
    const wasteA = (sheet.largura_mm - (a.x + a.w)) + (sheet.altura_mm - (a.y + a.h));
    const wasteB = (sheet.largura_mm - (b.x + b.w)) + (sheet.altura_mm - (b.y + b.h));
    // Desconto de tightness: posições com mais lados encostados têm desperdício efetivo menor
    const adjA = wasteA - a.tightnessScore * 600;
    const adjB = wasteB - b.tightnessScore * 600;
    return adjA - adjB || a.y - b.y || a.x - b.x;
  })[0];
}
