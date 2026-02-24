import type { WorkspaceBox } from "../core/types";
import type { DoorOrDrawer } from "./DoorOrDrawer";

export interface BoxModel extends WorkspaceBox {
  doorsAndDrawers: DoorOrDrawer[];
}
