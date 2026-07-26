/**
 * frontModels.ts — Frentes industriais (catalogo documental).
 */

import type { KitchenFrontModel } from "../types";

export function buildFrontModels(): KitchenFrontModel[] {
  return [
    {
      id: "front-standard",
      name: "Frente padrão",
      style: "standard",
      thicknessMm: 19,
      gapEachMm: 1,
      applicableModuleKinds: ["base", "tall", "upper", "corner"],
      integrations: { technicalViews: true, dxf: true, overlay: true, docs: true },
    },
    {
      id: "front-dual",
      name: "Frente dupla (externa + interna)",
      style: "dual",
      thicknessMm: 19,
      gapEachMm: 1,
      applicableModuleKinds: ["base"],
      integrations: { technicalViews: true, dxf: true, overlay: true, docs: true },
    },
    {
      id: "front-internal",
      name: "Frente interna",
      style: "internal",
      thicknessMm: 16,
      gapEachMm: 2,
      applicableModuleKinds: ["base"],
      integrations: { technicalViews: true, dxf: true, overlay: true, docs: true },
    },
    {
      id: "front-tall",
      name: "Frente módulo alto",
      style: "tall",
      thicknessMm: 19,
      gapEachMm: 1,
      applicableModuleKinds: ["tall", "corner"],
      integrations: { technicalViews: true, dxf: true, overlay: true, docs: true },
    },
    {
      id: "front-upper",
      name: "Frente módulo superior",
      style: "upper",
      thicknessMm: 19,
      gapEachMm: 1,
      applicableModuleKinds: ["upper"],
      integrations: { technicalViews: true, dxf: true, overlay: true, docs: true },
    },
  ];
}
