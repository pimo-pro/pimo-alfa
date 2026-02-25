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
  width: number;
  height: number;
  depth: number;
  frontThickness: number;
  materialId?: string;
  openDirection: "pull";
  isOpen: boolean;
  pullDistanceMm: number;
  posX: number;
  posY: number;
  posZ: number;
  rotY: number;
}
