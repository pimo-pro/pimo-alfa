/**
 * Proteção de furos emitidos (drilling).
 */

import type { EuropeanDrawerHole } from "../types";
import { ensureArray, isFiniteNonNegative, isFinitePositive, robustDebug } from "./safeNumbers";

/**
 * Emite apenas furos com coords finitas e Ø/prof > 0.
 * Groove (Ø=0) estrutural: permitir se profundidade > 0 e coords finitas.
 */
export function sanitizeHoles(holes: EuropeanDrawerHole[] | null | undefined): EuropeanDrawerHole[] {
  const list = ensureArray(holes, "holes");
  const out: EuropeanDrawerHole[] = [];
  for (const h of list) {
    const coordsOk =
      Number.isFinite(h.x) && Number.isFinite(h.y) && Number.isFinite(h.z);
    const isGroove = h.diameter === 0 && h.holeType === "fixacao_estrutural";
    const dimOk = isGroove
      ? isFinitePositive(h.depth) || isFiniteNonNegative(h.depth)
      : isFinitePositive(h.diameter) && isFinitePositive(h.depth);

    if (!coordsOk || !dimOk) {
      robustDebug("drilling", "furo omitido (coords/dims inválidos)", h);
      continue;
    }
    out.push({
      ...h,
      x: h.x,
      y: h.y,
      z: h.z,
      diameter: h.diameter,
      depth: h.depth,
    });
  }
  return out;
}
