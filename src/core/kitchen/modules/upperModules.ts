/**
 * upperModules.ts — Módulos superiores industriais (300–900 mm).
 */

import type { KitchenModuleSpec } from "../types";

const UPPER_WIDTHS = [300, 400, 450, 600, 800, 900] as const;
const UPPER_HEIGHT_MM = 720;
const UPPER_DEPTH_MM = 320;

export function buildUpperModules(): KitchenModuleSpec[] {
  return UPPER_WIDTHS.map((w) => ({
    id: `upper-${w}`,
    kind: "upper" as const,
    name: `Módulo superior ${w} mm`,
    widthMm: w,
    heightMm: UPPER_HEIGHT_MM,
    depthMm: UPPER_DEPTH_MM,
    metadata: {
      category: "upper",
      industrialCode: `MOD_UPPER_${w}`,
      defaultDrawers: 0,
      defaultDoors: w >= 800 ? 2 : 1,
    },
    integrations: {
      technicalViews: true,
      dxf: true,
      overlay: true,
      docs: true,
      industrialRules: true,
    },
  }));
}
