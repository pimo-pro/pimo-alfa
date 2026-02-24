export type DoorOrDrawerType = "door" | "drawer";

export type DoorOrDrawerOpenDirection =
  | "left"
  | "right"
  | "up"
  | "down"
  | "pull";

export interface DoorOrDrawer {
  id: string;
  parentBoxId: string;
  type: DoorOrDrawerType;
  width: number;
  height: number;
  depth: number;
  thickness: number;
  openDirection: DoorOrDrawerOpenDirection;
  isOpen: boolean;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
}
