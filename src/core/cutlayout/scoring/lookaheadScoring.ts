/**
 * Fase B (B2) — Lookahead 1-passo: estima desperdício futuro após colocação virtual.
 */

import { computeMaximalFreeRects, type PlacedRect } from "../solver/residualRects";
import type { SheetDefinition } from "../cutLayoutTypes";
import type { PlacementCandidate } from "./rotationScoring";

const TINY_POCKET_AREA_MM2 = 150 * 150;

/**
 * Simula colocação virtual e estima proxy de desperdício (bbox + pockets pequenos).
 * Leve — sem re-execução do skyline.
 */
export function simulatePlacementAndEstimateWaste(
  placement: PlacementCandidate,
  placedRects: PlacedRect[],
  sheet: SheetDefinition,
  kerf: number
): number {
  const afterPlaced: PlacedRect[] = [
    ...placedRects,
    { x: placement.x, y: placement.y, w: placement.w, h: placement.h },
  ];
  const sheetArea = Math.max(1, sheet.largura_mm * sheet.altura_mm);
  const usedArea = afterPlaced.reduce((acc, r) => acc + r.w * r.h, 0);
  const maxX = Math.max(...afterPlaced.map((r) => r.x + r.w));
  const maxY = Math.max(...afterPlaced.map((r) => r.y + r.h));
  const bboxArea = Math.max(usedArea, maxX * maxY);
  const bboxWaste = bboxArea - usedArea;
  const freeRects = computeMaximalFreeRects(sheet, afterPlaced, kerf);
  const tinyPocketPenalty = freeRects.filter((r) => r.w * r.h < TINY_POCKET_AREA_MM2).length * 2500;
  const slackWaste = Math.max(0, sheetArea - usedArea - freeRects.reduce((a, r) => a + r.w * r.h, 0));
  const tightnessBonus = (placement.tightnessScore ?? 0) * 8000;
  return bboxWaste + tinyPocketPenalty + slackWaste * 0.02 - tightnessBonus;
}
