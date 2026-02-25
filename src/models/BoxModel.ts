import type { WorkspaceBox } from "../core/types";
import type { DoorLayerItem, DrawerLayerItem } from "./BoxLayers";

export interface BoxModel extends WorkspaceBox {
  doorsLayer: DoorLayerItem[];
  drawersLayer: DrawerLayerItem[];
}
