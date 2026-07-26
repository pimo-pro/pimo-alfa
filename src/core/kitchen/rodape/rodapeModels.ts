/**
 * rodapeModels.ts — Roda-pé industrial (documental).
 */

import type { KitchenRodapeModel } from "../types";

export const KITCHEN_RODAPE_HEIGHT_MM = 100;

export function buildRodapeModels(): KitchenRodapeModel[] {
  return [
    {
      id: "rodape-100",
      heightMm: KITCHEN_RODAPE_HEIGHT_MM,
      recessMm: 0,
      dxfLayer: "RODAPE",
      technicalViews: ["front", "side_right", "side_left"],
    },
  ];
}
