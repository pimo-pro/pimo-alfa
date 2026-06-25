/**
 * Fase B — Rectângulos residuais maximais, preenchimento prioritário e micro-placement.
 * Reutiliza split guillotine via replay de colocações (sem alterar estado skyline/shelf).
 */

import type { CutPiece, SheetDefinition } from "../cutLayoutTypes";
import type { PlacementCandidate, RotationScoringConfig } from "../scoring/rotationScoring";
import { getOrientations, computeTightnessScore } from "../scoring/rotationScoring";
import { overlaps } from "../utils/cutLayoutUtils";
import { isRotatablePiece } from "../utils/cutLayoutUtils";
import { pruneContainedFreeRects } from "./strategyGuillotine";

const EPS = 0.001;
const MICRO_GRID_STEP_MM = 5;
const MIN_RESIDUAL_W = 40;
const MIN_RESIDUAL_H = 40;
/** Peças até ~447×447 mm² tratadas como pequenas/médias para fill residual. */
export const RESIDUAL_FILL_MAX_PIECE_AREA_MM2 = 200_000;

export type FreeRect = { x: number; y: number; w: number; h: number };
export type PlacedRect = { x: number; y: number; w: number; h: number };

function rectOverlapsPlacement(fr: FreeRect, p: PlacedRect, kerf: number): boolean {
  const margin = kerf / 2;
  return !(
    fr.x + fr.w <= p.x - margin ||
    p.x + p.w + margin <= fr.x ||
    fr.y + fr.h <= p.y - margin ||
    p.y + p.h + margin <= fr.y
  );
}

/** Subtrai peça colocada de um rect livre (até 4 faixas residuais). */
function subtractPieceFromFreeRect(fr: FreeRect, p: PlacedRect, kerf: number): FreeRect[] {
  if (!rectOverlapsPlacement(fr, p, kerf)) return [fr];

  const px = p.x;
  const py = p.y;
  const pw = p.w + kerf;
  const ph = p.h + kerf;
  const out: FreeRect[] = [];

  if (px > fr.x + EPS) {
    out.push({ x: fr.x, y: fr.y, w: px - fr.x, h: fr.h });
  }
  const rightX = px + pw;
  if (rightX < fr.x + fr.w - EPS) {
    out.push({ x: rightX, y: fr.y, w: fr.x + fr.w - rightX, h: fr.h });
  }
  if (py > fr.y + EPS) {
    out.push({ x: fr.x, y: fr.y, w: fr.w, h: py - fr.y });
  }
  const topY = py + ph;
  if (topY < fr.y + fr.h - EPS) {
    out.push({ x: fr.x, y: topY, w: fr.w, h: fr.y + fr.h - topY });
  }

  return out.filter((r) => r.w >= MIN_RESIDUAL_W && r.h >= MIN_RESIDUAL_H);
}

/** B1: rectângulos livres maximais por subtracção (compatível skyline/shelf/guillotine). */
export function computeMaximalFreeRects(
  sheet: SheetDefinition,
  placed: PlacedRect[],
  kerf: number
): FreeRect[] {
  let freeRects: FreeRect[] = [{ x: 0, y: 0, w: sheet.largura_mm, h: sheet.altura_mm }];
  if (placed.length === 0) return freeRects;

  for (const p of placed) {
    const next: FreeRect[] = [];
    for (const fr of freeRects) {
      next.push(...subtractPieceFromFreeRect(fr, p, kerf));
    }
    freeRects = pruneContainedFreeRects(next);
  }
  return freeRects.filter((r) => r.w >= MIN_RESIDUAL_W && r.h >= MIN_RESIDUAL_H);
}

function scoreOrientationFit(candidate: { x: number; y: number; w: number; h: number }, sheet: SheetDefinition): number {
  const sheetW = Math.max(1, sheet.largura_mm);
  const sheetH = Math.max(1, sheet.altura_mm);
  const sheetArea = Math.max(1, sheetW * sheetH);
  const rightSlack = Math.max(0, sheetW - (candidate.x + candidate.w));
  const topSlack = Math.max(0, sheetH - (candidate.y + candidate.h));
  const bottomLeft = 1 - (candidate.y / sheetH) * 0.75 - (candidate.x / sheetW) * 0.35;
  const stripWaste = (rightSlack * candidate.h + topSlack * candidate.w) / sheetArea;
  return bottomLeft * 0.6 + (1 - stripWaste) * 0.4;
}

function fitsInFreeRect(o: { w: number; h: number }, fr: FreeRect): boolean {
  return o.w <= fr.w + EPS && o.h <= fr.h + EPS;
}

/** Colocação no canto do rect residual (sem grid). */
export function findPlacementInFreeRect(
  piece: CutPiece,
  freeRect: FreeRect,
  sheet: SheetDefinition,
  placed: PlacedRect[],
  kerf: number,
  rotationCfg: RotationScoringConfig
): PlacementCandidate | null {
  const orientations = getOrientations(piece, rotationCfg, isRotatablePiece);
  let best: PlacementCandidate | null = null;
  for (const o of orientations) {
    if (!fitsInFreeRect(o, freeRect)) continue;
    const x = freeRect.x;
    const y = freeRect.y;
    if (overlaps(x, y, o.w, o.h, placed, kerf)) continue;
    const cand: PlacementCandidate = {
      x,
      y,
      w: o.w,
      h: o.h,
      rotation: o.rotation,
      orientationScore: scoreOrientationFit({ x, y, w: o.w, h: o.h }, sheet),
      tightnessScore: computeTightnessScore(x, y, o.w, o.h, sheet, placed, kerf),
      rotationDelta: 0,
      alternativeRotationAvailable: orientations.length > 1,
    };
    if (!best || (cand.tightnessScore ?? 0) > (best.tightnessScore ?? 0)) best = cand;
  }
  return best;
}

/** B4: scan 5 mm dentro do rect residual quando o canto falha. */
export function microPlacementInFreeRect(
  piece: CutPiece,
  freeRect: FreeRect,
  sheet: SheetDefinition,
  placed: PlacedRect[],
  kerf: number,
  rotationCfg: RotationScoringConfig
): PlacementCandidate | null {
  const orientations = getOrientations(piece, rotationCfg, isRotatablePiece);
  let best: PlacementCandidate | null = null;
  for (const o of orientations) {
    if (!fitsInFreeRect(o, freeRect)) continue;
    const xMax = freeRect.x + freeRect.w - o.w;
    const yMax = freeRect.y + freeRect.h - o.h;
    if (xMax < freeRect.x - EPS || yMax < freeRect.y - EPS) continue;
    for (let y = freeRect.y; y <= yMax + EPS; y += MICRO_GRID_STEP_MM) {
      for (let x = freeRect.x; x <= xMax + EPS; x += MICRO_GRID_STEP_MM) {
        if (overlaps(x, y, o.w, o.h, placed, kerf)) continue;
        const cand: PlacementCandidate = {
          x,
          y,
          w: o.w,
          h: o.h,
          rotation: o.rotation,
          orientationScore: scoreOrientationFit({ x, y, w: o.w, h: o.h }, sheet),
          tightnessScore: computeTightnessScore(x, y, o.w, o.h, sheet, placed, kerf),
          rotationDelta: 0,
          alternativeRotationAvailable: orientations.length > 1,
        };
        if (!best || (cand.tightnessScore ?? 0) > (best.tightnessScore ?? 0)) best = cand;
        if (best && (best.tightnessScore ?? 0) >= 0.75) return best;
      }
    }
  }
  return best;
}

export function findPlacementInFreeRectWithMicro(
  piece: CutPiece,
  freeRect: FreeRect,
  sheet: SheetDefinition,
  placed: PlacedRect[],
  kerf: number,
  rotationCfg: RotationScoringConfig
): PlacementCandidate | null {
  return (
    findPlacementInFreeRect(piece, freeRect, sheet, placed, kerf, rotationCfg) ??
    microPlacementInFreeRect(piece, freeRect, sheet, placed, kerf, rotationCfg)
  );
}

export type ResidualFillHit = { index: number; placement: PlacementCandidate };

/**
 * B1: antes da próxima peça grande, tenta encaixar pequenas/médias nos rects residuais.
 * Prioridade absoluta — devolve a primeira colocação válida (rect mais apertado + peça menor).
 */
export function tryFillResidualRects(
  remaining: CutPiece[],
  sheet: SheetDefinition,
  placed: PlacedRect[],
  kerf: number,
  rotationCfg: RotationScoringConfig
): ResidualFillHit | null {
  if (remaining.length === 0 || placed.length === 0) return null;

  const freeRects = computeMaximalFreeRects(sheet, placed, kerf);
  if (freeRects.length === 0) return null;

  freeRects.sort((a, b) => a.w * a.h - b.w * b.h || a.y - b.y || a.x - b.x);

  const candidateIndices = remaining
    .map((p, i) => ({ i, area: p.largura_mm * p.altura_mm }))
    .filter((x) => x.area <= RESIDUAL_FILL_MAX_PIECE_AREA_MM2)
    .sort((a, b) => a.area - b.area);

  for (const fr of freeRects) {
    for (const { i } of candidateIndices) {
      const piece = remaining[i]!;
      const placement = findPlacementInFreeRectWithMicro(piece, fr, sheet, placed, kerf, rotationCfg);
      if (placement) return { index: i, placement };
    }
  }
  return null;
}
