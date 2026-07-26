/**
 * baseModules.ts — Módulos base industriais (300–1200 mm).
 */

import type { KitchenModuleSpec } from "../types";

const BASE_WIDTHS = [300, 400, 450, 500, 600, 800, 900, 1000, 1200] as const;
const BASE_HEIGHT_MM = 720;
const BASE_DEPTH_MM = 560;

function baseIntegrations(): KitchenModuleSpec["integrations"] {
  return {
    technicalViews: true,
    dxf: true,
    overlay: true,
    docs: true,
    industrialRules: true,
  };
}

export function buildBaseModules(): KitchenModuleSpec[] {
  return BASE_WIDTHS.map((w) => ({
    id: `base-${w}`,
    kind: "base" as const,
    name: `Módulo base ${w} mm`,
    widthMm: w,
    heightMm: BASE_HEIGHT_MM,
    depthMm: BASE_DEPTH_MM,
    metadata: {
      category: "base",
      industrialCode: `MOD_BASE_${w}`,
      defaultDrawers: w >= 600 ? 3 : w >= 400 ? 2 : 1,
      defaultDoors: w >= 800 ? 2 : 1,
    },
    integrations: baseIntegrations(),
  }));
}
