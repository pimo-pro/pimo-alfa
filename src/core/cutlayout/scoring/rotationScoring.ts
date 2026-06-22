import type { CutPiece, SheetDefinition } from "../cutLayoutTypes";

type RotationPreferenceMode = "auto" | "aggressive" | "disabled";

export type RotationScoringConfig = {
  rotationWeight: number;
  rotationPenalty: number;
  rotationPreferenceMode: RotationPreferenceMode;
};

export type PlacementCandidate = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  orientationScore: number;
  rotationDelta: number;
  alternativeRotationAvailable: boolean;
  tightnessScore?: number; // 0–1: fração de lados encostados a paredes ou peças já colocadas
};

/**
 * Conta quantos lados da peça (x,y,w,h) tocam a borda da chapa ou peças já colocadas.
 * Retorna 0–1 (touchCount / 4 lados máximos).
 * Usado para recompensar encaixe lateral real (tight packing / interlocking).
 */
export function computeTightnessScore(
  x: number,
  y: number,
  w: number,
  h: number,
  sheet: SheetDefinition,
  placed: Array<{ x: number; y: number; w: number; h: number }>,
  kerf: number
): number {
  const adj = Math.max(0.5, kerf + 0.3);
  let touchCount = 0;
  if (x <= adj) touchCount++;
  if (y <= adj) touchCount++;
  if (x + w >= sheet.largura_mm - adj) touchCount++;
  if (y + h >= sheet.altura_mm - adj) touchCount++;
  for (const p of placed) {
    const overlapX = x < p.x + p.w + adj && x + w > p.x - adj;
    const overlapY = y < p.y + p.h + adj && y + h > p.y - adj;
    if (Math.abs(p.x + p.w + kerf - x) <= adj && overlapY) touchCount++;
    if (Math.abs(x + w + kerf - p.x) <= adj && overlapY) touchCount++;
    if (Math.abs(p.y + p.h + kerf - y) <= adj && overlapX) touchCount++;
    if (Math.abs(y + h + kerf - p.y) <= adj && overlapX) touchCount++;
  }
  return Math.min(1.0, touchCount / 4.0);
}

export function scoreOrientationFit(
  candidate: { x: number; y: number; w: number; h: number },
  sheet: SheetDefinition
): number {
  const sheetW = Math.max(1, sheet.largura_mm);
  const sheetH = Math.max(1, sheet.altura_mm);
  const sheetArea = Math.max(1, sheetW * sheetH);
  const rightSlack = Math.max(0, sheetW - (candidate.x + candidate.w));
  const topSlack = Math.max(0, sheetH - (candidate.y + candidate.h));
  const bottomLeft = 1 - (candidate.y / sheetH) * 0.75 - (candidate.x / sheetW) * 0.35;
  const stripWaste = (rightSlack * candidate.h + topSlack * candidate.w) / sheetArea;
  const fillQuality = 1 - stripWaste;
  return bottomLeft * 0.60 + fillQuality * 0.40;
}

export function getOrientations(
  piece: CutPiece,
  _cfg: RotationScoringConfig,
  isRotatablePiece: (_piece: CutPiece) => boolean
): Array<{ w: number; h: number; rotation: number }> {
  const list = [{ w: piece.largura_mm, h: piece.altura_mm, rotation: 0 }];
  const canRotate = isRotatablePiece(piece);
  if (canRotate) list.push({ w: piece.altura_mm, h: piece.largura_mm, rotation: 90 });
  return list;
}

export function chooseOrientationWithRotationBias(
  normal: PlacementCandidate | null,
  rotated: PlacementCandidate | null,
  cfg: RotationScoringConfig
): PlacementCandidate | null {
  if (!normal && !rotated) return null;
  if (normal && !rotated) return normal;
  if (!normal && rotated) return rotated;

  const rotationDelta = rotated!.orientationScore - normal!.orientationScore;
  // Score combinado: orientação + tightness para escolha baseada em encaixe real
  const normalCombined = normal!.orientationScore + (normal!.tightnessScore ?? 0) * 0.35;
  let rotatedCombined = rotated!.orientationScore + (rotated!.tightnessScore ?? 0) * 0.35;

  if (
    cfg.rotationPreferenceMode === "aggressive" ||
    cfg.rotationPreferenceMode === "auto"
  ) {
    const biasCap = cfg.rotationPreferenceMode === "aggressive" ? 0.12 : 0.06;
    rotatedCombined += Math.min(biasCap, cfg.rotationWeight * 0.08);
  }

  if (rotatedCombined > normalCombined) {
    return {
      ...rotated!,
      rotationDelta,
      alternativeRotationAvailable: true,
    };
  }
  return {
    ...normal!,
    rotationDelta,
    alternativeRotationAvailable: true,
  };
}

export function pickBestCandidateByRotation(
  candidates: PlacementCandidate[],
  rotation: 0 | 90
): PlacementCandidate | null {
  const pool = candidates.filter((c) => c.rotation === rotation);
  if (pool.length === 0) return null;
  return pool.sort((a, b) => {
    const sa = a.orientationScore + (a.tightnessScore ?? 0) * 0.35;
    const sb = b.orientationScore + (b.tightnessScore ?? 0) * 0.35;
    return sb - sa || a.y - b.y || a.x - b.x;
  })[0];
}
