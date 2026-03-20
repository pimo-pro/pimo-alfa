import type { CutPiece, SheetDefinition } from "../cutLayoutTypes";

const EPS = 0.001;

type PlacementCandidate = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  orientationScore: number;
  rotationDelta: number;
  alternativeRotationAvailable: boolean;
};
type RotationScoringConfig = {
  rotationWeight: number;
  rotationPenalty: number;
  rotationPreferenceMode: "auto" | "aggressive" | "disabled";
};

export function findPlacementShelf(
  piece: CutPiece,
  sheet: SheetDefinition,
  placed: Array<{ x: number; y: number; w: number; h: number }>,
  state: { shelves: Array<{ y: number; height: number; nextX: number }> },
  kerf: number,
  cfg: RotationScoringConfig,
  bin: "firstFit" | "bestFit",
  deps: {
    getOrientations: (piece: CutPiece, cfg: RotationScoringConfig) => Array<{ w: number; h: number; rotation: number }>;
    overlaps: (x: number, y: number, w: number, h: number, placed: Array<{ x: number; y: number; w: number; h: number }>, kerf: number) => boolean;
    scoreOrientationFit: (candidate: { x: number; y: number; w: number; h: number }, sheet: SheetDefinition) => number;
    pickBestCandidateByRotation: (candidates: PlacementCandidate[], rotation: 0 | 90) => PlacementCandidate | null;
    chooseOrientationWithRotationBias: (normal: PlacementCandidate | null, rotated: PlacementCandidate | null, cfg: RotationScoringConfig) => PlacementCandidate | null;
  }
): PlacementCandidate | null {
  const candidates: PlacementCandidate[] = [];
  const orientations = deps.getOrientations(piece, cfg);
  const sortedShelves = [...state.shelves].sort((a, b) => a.y - b.y);

  for (const o of orientations) {
    for (const shelf of sortedShelves) {
      const x = shelf.nextX;
      const y = shelf.y;
      if (x + o.w > sheet.largura_mm + EPS) continue;
      if (o.h > shelf.height + EPS) continue;
      if (y + o.h > sheet.altura_mm + EPS) continue;
      if (deps.overlaps(x, y, o.w, o.h, placed, kerf)) continue;
      candidates.push({
        x,
        y,
        w: o.w,
        h: o.h,
        rotation: o.rotation,
        orientationScore: deps.scoreOrientationFit({ x, y, w: o.w, h: o.h }, sheet),
        rotationDelta: 0,
        alternativeRotationAvailable: false,
      });
      if (bin === "firstFit") break;
    }

    const maxY = state.shelves.length === 0 ? 0 : Math.max(...state.shelves.map((s) => s.y + s.height + kerf));
    if (maxY + o.h <= sheet.altura_mm + EPS && o.w <= sheet.largura_mm + EPS) {
      const x = 0;
      const y = maxY;
      if (!deps.overlaps(x, y, o.w, o.h, placed, kerf)) {
        candidates.push({
          x,
          y,
          w: o.w,
          h: o.h,
          rotation: o.rotation,
          orientationScore: deps.scoreOrientationFit({ x, y, w: o.w, h: o.h }, sheet),
          rotationDelta: 0,
          alternativeRotationAvailable: false,
        });
      }
    }
  }

  if (candidates.length === 0) return null;
  if (bin === "firstFit") {
    const normal = deps.pickBestCandidateByRotation(candidates, 0);
    const rotated = deps.pickBestCandidateByRotation(candidates, 90);
    return deps.chooseOrientationWithRotationBias(normal, rotated, cfg);
  }

  return candidates.sort((a, b) => {
    const remainingA = sheet.largura_mm - (a.x + a.w);
    const remainingB = sheet.largura_mm - (b.x + b.w);
    return remainingA - remainingB || a.y - b.y || a.x - b.x;
  })[0];
}
