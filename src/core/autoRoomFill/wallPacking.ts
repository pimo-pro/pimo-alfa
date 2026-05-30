import { LOWER_WIDTHS_MM, nearestPackWidth, UPPER_WIDTHS_MM } from "./moduleCatalog";

export type PackedRun = {
  widthsMm: number[];
  trimLastMm?: number;
};

const TRIM_MIN_MM = 10;
const TRIM_MAX_MM = 40;

/**
 * Preenche um comprimento útil com larguras de módulo (greedy, maiores primeiro).
 */
export function packWallSpan(
  spanMm: number,
  tier: "lower" | "upper",
  reservedMm = 0
): PackedRun {
  const allowed = tier === "lower" ? LOWER_WIDTHS_MM : UPPER_WIDTHS_MM;
  const usable = Math.max(0, spanMm - reservedMm);
  const widths: number[] = [];
  let remaining = usable;

  while (remaining >= 280) {
    const pick = nearestPackWidth(remaining, allowed);
    if (pick == null) break;
    widths.push(pick);
    remaining -= pick;
  }

  if (remaining >= TRIM_MIN_MM && remaining <= TRIM_MAX_MM && widths.length > 0) {
    return { widthsMm: widths, trimLastMm: remaining };
  }

  if (remaining > 0 && remaining < TRIM_MIN_MM && widths.length > 0) {
    return { widthsMm: widths };
  }

  if (remaining >= 280) {
    const small = nearestPackWidth(remaining, allowed, 280);
    if (small) widths.push(small);
  }

  return { widthsMm: widths };
}
