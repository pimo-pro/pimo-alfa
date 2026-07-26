/**
 * remateModels.ts — Remates industriais (documentais).
 */

import type { KitchenRemateModel } from "../types";

export function buildRemateModels(thicknessMm = 19): KitchenRemateModel[] {
  const positions = ["cima", "baixo", "lat_dir", "lat_esq"] as const;
  return positions.map((position) => ({
    id: `remate-${position}`,
    position,
    thicknessMm,
    recessMm: 0,
    dxfLayer: "REMATE" as const,
  }));
}
