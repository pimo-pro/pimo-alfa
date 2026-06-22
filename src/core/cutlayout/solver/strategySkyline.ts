import { computeTightnessScore } from "../scoring/rotationScoring";
import type { PlacementCandidate, RotationScoringConfig } from "../scoring/rotationScoring";
import type { CutPiece, SheetDefinition } from "../cutLayoutTypes";

type SkylineSegment = { x: number; y: number };

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

/**
 * Gera candidatos X para placement no skyline.
 * Inclui os breakpoints do skyline E as bordas direitas das peças já colocadas,
 * o que permite tight packing horizontal entre peças adjacentes.
 */
export function getCandidateX(
  skyline: SkylineSegment[],
  sheetW: number,
  pieceW: number,
  placed?: Array<{ x: number; y: number; w: number; h: number }>,
  kerf = 0
): number[] {
  const xs = new Set<number>();
  xs.add(0);
  for (const seg of skyline) {
    if (seg.x >= 0 && seg.x <= sheetW - pieceW) xs.add(seg.x);
  }
  // Bordas direitas e esquerda de peças colocadas → interlocking horizontal em níveis Y distintos
  if (placed) {
    for (const p of placed) {
      const rx = Math.round((p.x + p.w + kerf) * 1000) / 1000;
      if (rx >= 0 && rx <= sheetW - pieceW) xs.add(rx);
      const lx = Math.round(p.x * 1000) / 1000;
      if (lx >= 0 && lx <= sheetW - pieceW) xs.add(lx);
    }
  }
  return Array.from(xs).sort((a, b) => a - b);
}

/** Penaliza bbox inflada e ilhas de desperdício no meio da chapa (skyline bestFit). */
function scoreSkylinePlacement(
  candidate: PlacementCandidate,
  sheet: SheetDefinition,
  placed: Array<{ x: number; y: number; w: number; h: number }>
): number {
  const maxX = Math.max(0, ...placed.map((p) => p.x + p.w), candidate.x + candidate.w);
  const maxY = Math.max(0, ...placed.map((p) => p.y + p.h), candidate.y + candidate.h);
  const stripWaste =
    Math.max(0, sheet.largura_mm - (candidate.x + candidate.w)) * candidate.h +
    Math.max(0, sheet.altura_mm - (candidate.y + candidate.h)) * candidate.w;
  const tightness = candidate.tightnessScore ?? 0;
  const islandPenalty =
    tightness < 0.2 && candidate.x > sheet.largura_mm * 0.05 && candidate.y > sheet.altura_mm * 0.05
      ? maxX * maxY * 0.0004
      : 0;
  const bboxPenalty = maxX * maxY * 0.00015;
  return stripWaste + bboxPenalty + islandPenalty - tightness * 16000;
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
    const xs = getCandidateX(state.skyline, sheet.largura_mm, o.w, placed, kerf);
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
        tightnessScore: computeTightnessScore(x, y, o.w, o.h, sheet, placed, kerf),
        rotationDelta: 0,
        alternativeRotationAvailable: false,
      });
    }
  }

  if (candidates.length === 0) return null;
  const normal = deps.pickBestCandidateByRotation(candidates, 0);
  const rotated = deps.pickBestCandidateByRotation(candidates, 90);
  const picked = deps.chooseOrientationWithRotationBias(normal, rotated, cfg);
  if (bin === "firstFit" && picked) return picked;
  return candidates.sort((a, b) => {
    const scoreA = scoreSkylinePlacement(a, sheet, placed);
    const scoreB = scoreSkylinePlacement(b, sheet, placed);
    return scoreA - scoreB || a.y - b.y || a.x - b.x || b.orientationScore - a.orientationScore;
  })[0];
}
