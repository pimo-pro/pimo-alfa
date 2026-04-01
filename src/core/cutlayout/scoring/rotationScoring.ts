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
};

export function scoreOrientationFit(
  candidate: { x: number; y: number; w: number; h: number },
  sheet: SheetDefinition
): number {
  const sheetW = Math.max(1, sheet.largura_mm);
  const sheetH = Math.max(1, sheet.altura_mm);
  const sheetArea = Math.max(1, sheetW * sheetH);
  const rightSlack = Math.max(0, sheetW - (candidate.x + candidate.w));
  const topSlack = Math.max(0, sheetH - (candidate.y + candidate.h));
  const bottomLeft = 1 - (candidate.y / sheetH) * 0.7 - (candidate.x / sheetW) * 0.3;
  const stripWaste = (rightSlack * candidate.h + topSlack * candidate.w) / sheetArea;
  const fillQuality = 1 - stripWaste;
  return bottomLeft * 0.55 + fillQuality * 0.45;
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

  const normalScore = normal!.orientationScore;
  const rotatedScore = rotated!.orientationScore;
  const rotationDelta = rotatedScore - normalScore;
  const adjustedNormal = normalScore;
  let adjustedRotated = rotatedScore;

  if (
    cfg.rotationPreferenceMode === "aggressive" ||
    cfg.rotationPreferenceMode === "auto" ||
    cfg.rotationPreferenceMode === "disabled"
  ) {
    adjustedRotated += cfg.rotationWeight;
  }

  if (adjustedRotated > adjustedNormal) {
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
  return pool.sort((a, b) => b.orientationScore - a.orientationScore || a.y - b.y || a.x - b.x)[0];
}
