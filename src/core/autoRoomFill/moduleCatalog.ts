/**
 * Catálogo interno para Auto-Room-Fill (apenas visual; IDs do registro paramétrico).
 */

export const LOWER_WIDTHS_MM = [900, 800, 600, 500, 450, 400, 300] as const;

export const UPPER_WIDTHS_MM = [800, 600, 400, 300] as const;

const LOWER_BY_WIDTH: Record<number, string> = {
  300: "base-300-porta-2prateleiras",
  400: "base-400-3gavetas",
  450: "base-500-3gavetas",
  500: "base-500-3gavetas",
  600: "base-600-2portas-2prateleiras",
  800: "base-800-2portas-2prateleiras",
  900: "base-900-2portas-2prateleiras",
};

const UPPER_BY_WIDTH: Record<number, string> = {
  300: "upper-300-porta-2prateleiras",
  400: "upper-400-porta-2prateleiras",
  600: "upper-600-porta-2prateleiras",
  800: "upper-800-2portas-2prateleiras",
};

export const CORNER_LOWER_ID = "corner-ff-cozinha-inferior";
export const CORNER_UPPER_ID = "corner-ff-cozinha-superior";

/** Módulos especiais — mapeados para larguras representativas no catálogo. */
export const SPECIAL_CATALOG: Record<
  import("./autoRoomFillTypes").AutoFillSpecialKind,
  { lowerId: string; upperId?: string; widthMm: number }
> = {
  sink: { lowerId: "base-800-2portas-2prateleiras", widthMm: 800 },
  cooktop: { lowerId: "base-600-2portas-2prateleiras", widthMm: 600 },
  oven: { lowerId: "base-600-3gavetas", widthMm: 600 },
  fridge: { lowerId: "base-900-2portas-2prateleiras", widthMm: 900 },
  hood: { upperId: "upper-600-porta-2prateleiras", lowerId: "base-600-2portas-2prateleiras", widthMm: 600 },
};

export function catalogIdForLowerWidth(widthMm: number): string {
  const exact = LOWER_BY_WIDTH[widthMm];
  if (exact) return exact;
  const nearest = LOWER_WIDTHS_MM.find((w) => w <= widthMm) ?? 300;
  return LOWER_BY_WIDTH[nearest] ?? "base-600-2portas-2prateleiras";
}

export function catalogIdForUpperWidth(widthMm: number): string {
  const exact = UPPER_BY_WIDTH[widthMm];
  if (exact) return exact;
  const nearest = UPPER_WIDTHS_MM.find((w) => w <= widthMm) ?? 300;
  return UPPER_BY_WIDTH[nearest] ?? "upper-600-porta-2prateleiras";
}

export function nearestPackWidth(
  remainingMm: number,
  allowed: readonly number[],
  minMm = 280
): number | null {
  const sorted = [...allowed].sort((a, b) => b - a);
  for (const w of sorted) {
    if (w <= remainingMm && w >= minMm) return w;
  }
  return null;
}
