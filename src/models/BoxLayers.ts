export type LayerOpenDirection = "left" | "right" | "up" | "down" | "pull";

export interface DoorLayerItem {
  id: string;
  parentBoxId: string;
  groupType?: "simples" | "dupla";
  width: number;
  height: number;
  thickness: number;
  materialId?: string;
  openDirection: Exclude<LayerOpenDirection, "pull">;
  isOpen: boolean;
  hingeSide: "left" | "right";
  pivot: "left-edge" | "right-edge" | "top-edge" | "bottom-edge";
  posX: number;
  posY: number;
  posZ: number;
  rotY: number;
}

export interface DrawerLayerItem {
  id: string;
  parentBoxId: string;
  type?: "normal" | "pro";
  drawerType?: "normal" | "pro";
  sideMaterial?: "wood" | "aluminum";
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
  openDirection: "pull";
  isOpen: boolean;
  pullDistanceMm: number;
  posX: number;
  posY: number;
  posZ: number;
  rotY: number;
}
