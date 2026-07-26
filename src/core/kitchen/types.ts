/**
 * Tipos base da Kitchen Library industrial (Fase 15 / PIMO.PRO-V5 Fase 10).
 * Camada documental — não altera Modelo B / industrial/** / Modelo A.
 */

export type KitchenModuleKind = "base" | "tall" | "upper" | "corner";

export type KitchenModuleSpec = {
  id: string;
  kind: KitchenModuleKind;
  name: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  cornerType?: "L" | "diagonal";
  metadata: {
    category: string;
    industrialCode: string;
    defaultDrawers?: number;
    defaultDoors?: number;
  };
  /** Integrações documentais (presença na library, sem gerar peças). */
  integrations: {
    technicalViews: boolean;
    dxf: boolean;
    overlay: boolean;
    docs: boolean;
    industrialRules: boolean;
  };
};

export type KitchenFrontModel = {
  id: string;
  name: string;
  style: "standard" | "dual" | "internal" | "tall" | "upper";
  thicknessMm: number;
  gapEachMm: number;
  applicableModuleKinds: KitchenModuleKind[];
  integrations: { technicalViews: boolean; dxf: boolean; overlay: boolean; docs: boolean };
};

export type KitchenDoorModel = {
  id: string;
  name: string;
  style: "simple" | "double" | "upper" | "tall" | "corner";
  hingeSide: "left" | "right" | "both" | "corner";
  applicableModuleKinds: KitchenModuleKind[];
  integrations: { technicalViews: boolean; dxf: boolean; metadata: boolean };
};

export type KitchenRemateModel = {
  id: string;
  position: "cima" | "baixo" | "lat_dir" | "lat_esq";
  thicknessMm: number;
  recessMm: number;
  dxfLayer: "REMATE";
};

export type KitchenRodapeModel = {
  id: string;
  heightMm: number;
  recessMm: number;
  dxfLayer: "RODAPE";
  technicalViews: Array<"front" | "side_right" | "side_left">;
};

export type KitchenIndustrialRules = {
  assembly: string[];
  spacing: string[];
  tolerance: string[];
  frontDoorDrawer: string[];
  remateRodape: string[];
  module: string[];
};
