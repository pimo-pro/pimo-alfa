import { computeTightnessScore } from "../scoring/rotationScoring";
import type { PlacementCandidate, RotationScoringConfig } from "../scoring/rotationScoring";
import type { CutPiece, SheetDefinition } from "../cutLayoutTypes";

const EPS = 0.001;

export function findPlacementShelf(
  piece: CutPiece,
  sheet: SheetDefinition,
  placed: Array<{ x: number; y: number; w: number; h: number }>,
  state: { shelves: Array<{ y: number; height: number; nextX: number }> },
  kerf: number,
  cfg: RotationScoringConfig,
  bin: "firstFit" | "bestFit",
  deps: {
    getOrientations: (_piece: CutPiece, _cfg: RotationScoringConfig) => Array<{ w: number; h: number; rotation: number }>;
    overlaps: (_x: number, _y: number, _w: number, _h: number, _placed: Array<{ x: number; y: number; w: number; h: number }>, _kerf: number) => boolean;
    scoreOrientationFit: (_candidate: { x: number; y: number; w: number; h: number }, _sheet: SheetDefinition) => number;
    pickBestCandidateByRotation: (_candidates: PlacementCandidate[], _rotation: 0 | 90) => PlacementCandidate | null;
    chooseOrientationWithRotationBias: (_normal: PlacementCandidate | null, _rotated: PlacementCandidate | null, _cfg: RotationScoringConfig) => PlacementCandidate | null;
  }
): PlacementCandidate | null {
  const candidates: PlacementCandidate[] = [];
  const orientations = deps.getOrientations(piece, cfg);
  const sortedShelves = [...state.shelves]
    .filter((s) => orientations.some((o) => o.h <= s.height + EPS))
    .sort((a, b) => a.y - b.y);

  for (const o of orientations) {
    const shelvesForPiece = [...sortedShelves]
      .filter((shelf) => o.h <= shelf.height + EPS && shelf.y + o.h <= sheet.altura_mm + EPS)
      .sort(
        (a, b) =>
          Math.abs(a.height - o.h) - Math.abs(b.height - o.h) ||
          a.y - b.y
      );

    for (const shelf of shelvesForPiece) {
      const y = shelf.y;
      const xCandidates: number[] = [shelf.nextX];
      const inLine = placed
        .filter((p) => Math.abs(p.y - shelf.y) < EPS)
        .sort((a, b) => a.x - b.x);
      for (const p of inLine) {
        xCandidates.push(p.x + p.w + kerf);
      }
      // Bordas direitas de TODAS as peças colocadas para tight packing entre prateleiras
      for (const p of placed) {
        if (Math.abs(p.y - shelf.y) >= EPS) {
          const rx = p.x + p.w + kerf;
          if (rx >= 0 && rx + o.w <= sheet.largura_mm + EPS) xCandidates.push(rx);
        }
      }

      const uniqueX = Array.from(
        new Set(xCandidates.map((v) => Math.round(Math.max(0, v) * 1000) / 1000))
      ).sort((a, b) => a - b);

      const seen = new Set<number>();
      let extraCount = 0;
      for (let i = 0; i < uniqueX.length; i++) {
        const x = uniqueX[i]!;
        const k = Math.round(x * 1000) / 1000;
        if (seen.has(k)) continue;
        seen.add(k);

        if (i !== 0) {
          extraCount += 1;
          if (extraCount > 12) break;
        }

        if (x + o.w > sheet.largura_mm + EPS) continue;
        if (deps.overlaps(x, y, o.w, o.h, placed, kerf)) continue;
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
          tightnessScore: computeTightnessScore(x, y, o.w, o.h, sheet, placed, kerf),
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
    const heightSlackA = Math.abs(a.h - (state.shelves.find((s) => s.y === a.y)?.height ?? a.h));
    const heightSlackB = Math.abs(b.h - (state.shelves.find((s) => s.y === b.y)?.height ?? b.h));
    const remainingA = sheet.largura_mm - (a.x + a.w) - a.tightnessScore * 11000;
    const remainingB = sheet.largura_mm - (b.x + b.w) - b.tightnessScore * 11000;
    return (
      heightSlackA - heightSlackB ||
      remainingA - remainingB ||
      a.y - b.y ||
      a.x - b.x
    );
  })[0];
}
