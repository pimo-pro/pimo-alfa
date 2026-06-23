/**
 * Regras industriais de profundidade de corrediças de gaveta.
 * Comprimentos permitidos: 350–600 mm (passo de 50 mm).
 */

/** Comprimentos industriais de corrediça (mm) — únicos valores permitidos. */
export const DRAWER_SLIDE_LENGTHS_MM = [350, 400, 450, 500, 550, 600] as const;

export type DrawerSlideLengthMm = (typeof DRAWER_SLIDE_LENGTHS_MM)[number];

/**
 * Profundidade útil para seleção de corrediça:
 * profundidade_externa − espessura_frente − folgas traseiras.
 */
export function resolveDrawerUsableDepthMm(
  depthExternalMm: number,
  frontThicknessMm: number,
  clearanceMm: number
): number {
  const external = Number(depthExternalMm);
  const front = Number(frontThicknessMm);
  const clearance = Number(clearanceMm);
  if (!Number.isFinite(external) || external <= 0) return 0;
  const subtract =
    (Number.isFinite(front) && front > 0 ? front : 0) +
    (Number.isFinite(clearance) && clearance > 0 ? clearance : 0);
  return Math.max(0, external - subtract);
}

/**
 * Maior comprimento de corrediça da lista industrial que cabe na profundidade útil.
 */
export function resolveDrawerSlideLength(usableDepthMm: number): DrawerSlideLengthMm {
  const usable = Number(usableDepthMm);
  if (!Number.isFinite(usable) || usable <= 0) {
    return DRAWER_SLIDE_LENGTHS_MM[0];
  }
  const fitting = DRAWER_SLIDE_LENGTHS_MM.filter((length) => length <= usable);
  return fitting.length > 0 ? fitting[fitting.length - 1]! : DRAWER_SLIDE_LENGTHS_MM[0];
}

export function isDrawerSlideLengthMm(value: number): value is DrawerSlideLengthMm {
  return (DRAWER_SLIDE_LENGTHS_MM as readonly number[]).includes(value);
}
