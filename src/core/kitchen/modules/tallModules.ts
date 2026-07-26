/**
 * tallModules.ts — Módulos altos industriais (1500–2200 mm).
 */

import type { KitchenModuleSpec } from "../types";

const TALL_HEIGHTS = [1500, 1800, 2000, 2100, 2200] as const;
const TALL_WIDTHS = [450, 600] as const;
const TALL_DEPTH_MM = 560;

export function buildTallModules(): KitchenModuleSpec[] {
  const out: KitchenModuleSpec[] = [];
  for (const h of TALL_HEIGHTS) {
    for (const w of TALL_WIDTHS) {
      out.push({
        id: `tall-${w}x${h}`,
        kind: "tall",
        name: `Módulo alto ${w}×${h} mm`,
        widthMm: w,
        heightMm: h,
        depthMm: TALL_DEPTH_MM,
        metadata: {
          category: "tall",
          industrialCode: `MOD_TALL_${w}_${h}`,
          defaultDrawers: 0,
          defaultDoors: 1,
        },
        integrations: {
          technicalViews: true,
          dxf: true,
          overlay: true,
          docs: true,
          industrialRules: true,
        },
      });
    }
  }
  return out;
}
