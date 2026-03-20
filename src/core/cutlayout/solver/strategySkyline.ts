import type { CutPiece, SheetDefinition } from "../cutLayoutTypes";

type SkylineSegment = { x: number; y: number };
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

export function getSkylineHeight(skyline: SkylineSegment[], xStart: number, width: number): number {
  const xEnd = xStart + width;
  let maxY = 0;
  for (let i = 0; i < skyline.length - 1; i++) {
    const segStart = skyline[i].x;
    const segEnd = skyline[i + 1].x;
    if (segEnd <= xStart || segStart >= xEnd) continue;
    maxY = Math.max(maxY, skyline[i].y);
  }
  return maxY;
}

export function getSkylineYAt(skyline: SkylineSegment[], x: number): number {
  for (let i = 0; i < skyline.length - 1; i++) {
    if (skyline[i].x <= x && x < skyline[i + 1].x) return skyline[i].y;
  }
  return skyline.length > 0 ? skyline[skyline.length - 1].y : 0;
}

export function mergeSkylineSegments(segments: SkylineSegment[]): SkylineSegment[] {
  if (segments.length <= 1) return segments;
  const sorted = [...segments].sort((a, b) => a.x - b.x);
  const out: SkylineSegment[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y === out[out.length - 1].y) continue;
    out.push(sorted[i]);
  }
  return out;
}

export function updateSkyline(
  skyline: SkylineSegment[],
  x: number,
  y: number,
  w: number,
  h: number,
  kerf: number
): SkylineSegment[] {
  const newH = y + h + kerf;
  const xEnd = x + w;
  const out: SkylineSegment[] = [];
  let i = 0;
  while (i < skyline.length && skyline[i].x < x) {
    out.push(skyline[i]);
    i++;
  }
  out.push({ x, y: newH });
  const heightAtEnd = getSkylineYAt(skyline, xEnd);
  while (i < skyline.length && skyline[i].x <= xEnd) i++;
  out.push({ x: xEnd, y: heightAtEnd });
  while (i < skyline.length) {
    out.push(skyline[i]);
    i++;
  }
  return mergeSkylineSegments(out);
}

export function getCandidateX(skyline: SkylineSegment[], sheetW: number, pieceW: number): number[] {
  const xs = new Set<number>();
  xs.add(0);
  for (const seg of skyline) {
    if (seg.x >= 0 && seg.x <= sheetW - pieceW) xs.add(seg.x);
  }
  return Array.from(xs).sort((a, b) => a - b);
}

export function findPlacementSkyline(
  piece: CutPiece,
  sheet: SheetDefinition,
  placed: Array<{ x: number; y: number; w: number; h: number }>,
  state: { skyline: SkylineSegment[] },
  kerf: number,
  cfg: RotationScoringConfig,
  bin: "firstFit" | "bestFit",
  deps: {
    getOrientations: (_piece: CutPiece, _cfg: RotationScoringConfig) => Array<{ w: number; h: number; rotation: number }>;
    overlaps: (
      _x: number,
      _y: number,
      _w: number,
      _h: number,
      _placed: Array<{ x: number; y: number; w: number; h: number }>,
      _kerf: number
    ) => boolean;
    scoreOrientationFit: (
      _candidate: { x: number; y: number; w: number; h: number },
      _sheet: SheetDefinition
    ) => number;
    pickBestCandidateByRotation: (_candidates: PlacementCandidate[], _rotation: 0 | 90) => PlacementCandidate | null;
    chooseOrientationWithRotationBias: (
      _normal: PlacementCandidate | null,
      _rotated: PlacementCandidate | null,
      _cfg: RotationScoringConfig
    ) => PlacementCandidate | null;
  }
): PlacementCandidate | null {
  const orientations = deps.getOrientations(piece, cfg);
  const candidates: PlacementCandidate[] = [];

  for (const o of orientations) {
    if (o.w > sheet.largura_mm || o.h > sheet.altura_mm) continue;
    const xs = getCandidateX(state.skyline, sheet.largura_mm, o.w);
    for (const x of xs) {
      const y = getSkylineHeight(state.skyline, x, o.w);
      if (y + o.h > sheet.altura_mm) continue;
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
  }

  if (candidates.length === 0) return null;
  const normal = deps.pickBestCandidateByRotation(candidates, 0);
  const rotated = deps.pickBestCandidateByRotation(candidates, 90);
  const picked = deps.chooseOrientationWithRotationBias(normal, rotated, cfg);
  if (bin === "firstFit" && picked) return picked;
  return candidates.sort((a, b) => a.y - b.y || a.x - b.x || b.orientationScore - a.orientationScore)[0];
}
