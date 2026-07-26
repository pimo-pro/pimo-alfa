/**
 * cornerModules.ts — Módulos canto industriais (L / diagonal).
 */

import type { KitchenModuleSpec } from "../types";

export function buildCornerModules(): KitchenModuleSpec[] {
  return [
    {
      id: "corner-L-900",
      kind: "corner",
      name: "Módulo canto L 900×900",
      widthMm: 900,
      heightMm: 720,
      depthMm: 560,
      cornerType: "L",
      metadata: {
        category: "corner",
        industrialCode: "MOD_CORNER_L_900",
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
    },
    {
      id: "corner-diag-900",
      kind: "corner",
      name: "Módulo canto diagonal 900",
      widthMm: 900,
      heightMm: 720,
      depthMm: 560,
      cornerType: "diagonal",
      metadata: {
        category: "corner",
        industrialCode: "MOD_CORNER_DIAG_900",
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
    },
    {
      id: "corner-L-1000-tall",
      kind: "corner",
      name: "Módulo canto L alto 1000×2100",
      widthMm: 1000,
      heightMm: 2100,
      depthMm: 560,
      cornerType: "L",
      metadata: {
        category: "corner_tall",
        industrialCode: "MOD_CORNER_L_1000_2100",
        defaultDrawers: 0,
        defaultDoors: 2,
      },
      integrations: {
        technicalViews: true,
        dxf: true,
        overlay: true,
        docs: true,
        industrialRules: true,
      },
    },
  ];
}
