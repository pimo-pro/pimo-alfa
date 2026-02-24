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
  /** Posição local explícita do item na frente do box (mm). */
  posX?: number;
  posY?: number;
  posZ?: number;
  /** Rotação Y base do item (rad). */
  rotY?: number;
  /** Lado da dobradiça para portas. */
  hingeSide?: "left" | "right";
  /** Tipo de pivô usado na animação/abertura. */
  pivot?: "left-edge" | "right-edge" | "top-edge" | "bottom-edge" | "front";
}
