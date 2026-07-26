/**
 * doorModels.ts — Portas industriais (catalogo documental).
 */

import type { KitchenDoorModel } from "../types";

export function buildDoorModels(): KitchenDoorModel[] {
  return [
    {
      id: "door-simple",
      name: "Porta simples",
      style: "simple",
      hingeSide: "left",
      applicableModuleKinds: ["base", "tall", "upper"],
      integrations: { technicalViews: true, dxf: true, metadata: true },
    },
    {
      id: "door-double",
      name: "Porta dupla",
      style: "double",
      hingeSide: "both",
      applicableModuleKinds: ["base", "upper", "tall"],
      integrations: { technicalViews: true, dxf: true, metadata: true },
    },
    {
      id: "door-upper",
      name: "Porta superior",
      style: "upper",
      hingeSide: "right",
      applicableModuleKinds: ["upper"],
      integrations: { technicalViews: true, dxf: true, metadata: true },
    },
    {
      id: "door-tall",
      name: "Porta alta",
      style: "tall",
      hingeSide: "left",
      applicableModuleKinds: ["tall"],
      integrations: { technicalViews: true, dxf: true, metadata: true },
    },
    {
      id: "door-corner",
      name: "Porta canto",
      style: "corner",
      hingeSide: "corner",
      applicableModuleKinds: ["corner"],
      integrations: { technicalViews: true, dxf: true, metadata: true },
    },
  ];
}
