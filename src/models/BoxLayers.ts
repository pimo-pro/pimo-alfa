export type LayerOpenDirection = "left" | "right" | "up" | "down" | "pull";
import type { DrawerHandlePosition, DrawerHandleType, DrawerMetalBoxType, DrawerSlideType } from "../core/settings/settingsSchema";

/**
 * Modelo unificado de porta (fonte de verdade para estado e UI).
 * Usado por: ProjectProvider (estado), Configuração de Regras → Regras da Porta, painéis de layers.
 * A camada de visualização (BoxBuilder) converte para DoorSpec (metros) para o Three.js.
 */
export interface DoorLayerItem {
  id: string;
  parentBoxId: string;
  groupType?: "simples" | "dupla";
  width: number;
  height: number;
  thickness: number;
  materialId?: string;
  /** ID canónico do material oficial (mesmo do módulo). Ex.: "mdf_branco", "carvalho". Valor padrão: getDefaultOfficialMaterial().canonicalId. */
  material?: string;
  openDirection: Exclude<LayerOpenDirection, "pull">;
  isOpen: boolean;
  hingeSide: "left" | "right" | "top" | "bottom";
  pivot: "left-edge" | "right-edge" | "top-edge" | "bottom-edge";
  posX: number;
  posY: number;
  posZ: number;
  rotY: number;
}

export type DrawerLayerMetadata = {
  nominalDepth?: number;
  frontMaterial?: string;
  slideType?: DrawerSlideType;
  metalBoxType?: DrawerMetalBoxType;
  softClose?: boolean;
  handleType?: DrawerHandleType;
  handlePosition?: DrawerHandlePosition;
  handleOffsetMm?: number;
  drawerType?: "normal" | "pro";
};

export interface DrawerLayerItem {
  id: string;
  parentBoxId: string;
  type?: "normal" | "pro";
  drawerType?: "normal" | "pro";
  sideMaterial?: "wood" | "aluminum";
  handleType?: DrawerHandleType;
  handlePosition?: DrawerHandlePosition;
  handleOffsetMm?: number;
  slideType?: DrawerSlideType;
  metalBoxType?: DrawerMetalBoxType;
  softClose?: boolean;
  capacityKg?: 30 | 40 | 50 | 70;
  drawerWarnings?: string[];
  bottomThickness?: number;
  sideThickness?: number;
  backThickness?: number;
  // Dimensões da FRENTE (cobre toda a abertura do box)
  width: number;
  height: number;
  depth: number;
  frontThickness: number;
  // Dimensões do CORPO (interno, com folgas para corrediças)
  bodyWidth?: number;
  bodyHeight?: number;
  bodyDepth?: number;
  // Dimensões das peças individuais (calculadas automaticamente)
  leftSideWidth?: number;
  leftSideHeight?: number;
  leftSideDepth?: number;
  rightSideWidth?: number;
  rightSideHeight?: number;
  rightSideDepth?: number;
  backWidth?: number;
  backHeight?: number;
  bottomWidth?: number;
  bottomDepth?: number;
  // Posicoes locais das pecas (mm)
  frontPosX?: number;
  frontPosY?: number;
  frontPosZ?: number;
  leftSidePosX?: number;
  leftSidePosY?: number;
  leftSidePosZ?: number;
  rightSidePosX?: number;
  rightSidePosY?: number;
  rightSidePosZ?: number;
  bottomPosX?: number;
  bottomPosY?: number;
  bottomPosZ?: number;
  backPosX?: number;
  backPosY?: number;
  backPosZ?: number;
  materialId?: string;
  /** ID canónico do material oficial (mesmo do módulo). Ex.: "mdf_branco", "carvalho". Valor padrão: getDefaultOfficialMaterial().canonicalId. */
  material?: string;
  openDirection: "pull";
  isOpen: boolean;
  pullDistanceMm: number;
  posX: number;
  posY: number;
  posZ: number;
  rotY: number;
  /** Configuração UI por gaveta (FASE 4) — espelha campos editáveis sem alterar geometria. */
  metadata?: DrawerLayerMetadata;
}
