import { LOWER_WIDTHS_MM, nearestPackWidth, UPPER_WIDTHS_MM } from "./moduleCatalog";
import { FILLER_PANEL_WIDTH_MM } from "./autoFillSettings";

export type PackedRun = {
  widthsMm: number[];
  trimLastMm?: number;
  fillerMm?: number;
};

const TRIM_MIN_MM = 5;
const TRIM_MAX_MM = 25;

const PREFERRED_COMBOS_LOWER: number[][] = [
  [900, 600, 600],
  [800, 600, 600],
  [600, 600, 600],
];

const PREFERRED_COMBOS_UPPER: number[][] = [
  [800, 600],
  [600, 600, 400],
  [600, 600],
];

function hasConsecutive300(widths: number[]): boolean {
  for (let i = 1; i < widths.length; i++) {
    if (widths[i] === 300 && widths[i - 1] === 300) return true;
  }
  return false;
}

function sanitizeWidths(widths: number[], tier: "lower" | "upper"): number[] {
  if (widths.length === 0) return widths;
  const minStart = tier === "lower" ? 400 : 300;
  let result = [...widths];
  if (result[0] < minStart && result.length > 1) {
    const swap = result.findIndex((w, i) => i > 0 && w >= minStart);
    if (swap > 0) {
      const tmp = result[0];
      result[0] = result[swap];
      result[swap] = tmp;
    }
  }
  if (hasConsecutive300(result)) {
    result = result.filter((w, i) => !(w === 300 && (i === 0 || result[i - 1] === 300)));
  }
  return result;
}

function tryPreferredCombos(
  usable: number,
  combos: number[][],
  tier: "lower" | "upper"
): PackedRun | null {
  for (const combo of combos) {
    const sum = combo.reduce((a, b) => a + b, 0);
    if (sum > usable) continue;
    const gap = usable - sum;
    if (gap >= TRIM_MIN_MM && gap <= TRIM_MAX_MM) {
      return { widthsMm: sanitizeWidths(combo, tier), trimLastMm: gap };
    }
    if (gap === 0) {
      return { widthsMm: sanitizeWidths(combo, tier) };
    }
    if (gap > TRIM_MAX_MM && gap <= FILLER_PANEL_WIDTH_MM + 30) {
      return { widthsMm: sanitizeWidths(combo, tier), fillerMm: gap };
    }
  }

  for (const combo of combos) {
    const sum = combo.reduce((a, b) => a + b, 0);
    if (sum <= usable && usable - sum < TRIM_MIN_MM) {
      return { widthsMm: sanitizeWidths(combo, tier) };
    }
  }

  return null;
}

function greedyPack(usable: number, allowed: readonly number[], tier: "lower" | "upper"): PackedRun {
  const widths: number[] = [];
  let remaining = usable;

  while (remaining >= 280) {
    const pick = nearestPackWidth(remaining, allowed, tier === "lower" ? 400 : 280);
    if (pick == null) break;
    if (widths.length === 0 && pick === 300 && remaining > 1500) {
      const alt = nearestPackWidth(remaining, allowed, 400);
      if (alt) {
        widths.push(alt);
        remaining -= alt;
        continue;
      }
    }
    if (pick === 300 && widths[widths.length - 1] === 300) {
      const alt = nearestPackWidth(remaining, allowed, 400);
      if (alt && alt !== 300) {
        widths.push(alt);
        remaining -= alt;
        continue;
      }
    }
    widths.push(pick);
    remaining -= pick;
  }

  const cleaned = sanitizeWidths(widths, tier);

  if (remaining >= TRIM_MIN_MM && remaining <= TRIM_MAX_MM && cleaned.length > 0) {
    return { widthsMm: cleaned, trimLastMm: remaining };
  }

  if (remaining > TRIM_MAX_MM && cleaned.length > 0) {
    if (remaining <= FILLER_PANEL_WIDTH_MM + 30) {
      return { widthsMm: cleaned, fillerMm: remaining };
    }
    const small = nearestPackWidth(remaining, allowed, 280);
    if (small) {
      return { widthsMm: [...cleaned, small] };
    }
    return { widthsMm: cleaned, fillerMm: remaining };
  }

  return { widthsMm: cleaned };
}

/**
 * Preenche comprimento útil: combinações preferidas → trim 5–25 mm → painel de enchimento → greedy.
 */
export function packWallSpan(
  spanMm: number,
  tier: "lower" | "upper",
  reservedMm = 0
): PackedRun {
  const allowed = tier === "lower" ? LOWER_WIDTHS_MM : UPPER_WIDTHS_MM;
  const usable = Math.max(0, spanMm - reservedMm);
  if (usable < 280) return { widthsMm: [] };

  const combos = tier === "lower" ? PREFERRED_COMBOS_LOWER : PREFERRED_COMBOS_UPPER;
  const preferred = tryPreferredCombos(usable, combos, tier);
  if (preferred) return preferred;

  return greedyPack(usable, allowed, tier);
}
