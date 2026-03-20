/**
 * @deprecated LEGACY — não utilizado pelo ViewerCore atual.
 * A sala 3D é gerida por `RoomManager` + `ViewerCore.setRoomFromManager` / `RoomBuilder`.
 * Mantido apenas para re-export estável em `3d/core/viewer` e documentação histórica; não integrar novo código aqui.
 *
 * Estado e lógica da sala no viewer (grupo, paredes, bounds).
 * O RoomManager (room/RoomManager) chama setRoomFromManager no Viewer; o Viewer delega para aqui.
 */

import type * as THREE from "three";
import type { RoomBounds, WallEntryForViewer } from "../../room/RoomManager";

export class ViewerRoomManager {
  private group: THREE.Group | null = null;
  private walls: WallEntryForViewer[] = [];
  private bounds: RoomBounds | null = null;

  getGroup(): THREE.Group | null {
    return this.group;
  }

  getWalls(): WallEntryForViewer[] {
    return this.walls;
  }

  getBounds(): RoomBounds | null {
    return this.bounds;
  }

  setRoomFromManager(
    root: THREE.Object3D,
    walls: WallEntryForViewer[],
    bounds: RoomBounds,
    group: THREE.Group
  ): void {
    if (this.group && this.group !== group) {
      root.remove(this.group);
    }
    this.group = group;
    this.walls = walls;
    this.bounds = bounds;
    root.add(group);
  }

  clearRoomFromManager(root: THREE.Object3D): void {
    if (this.group) {
      root.remove(this.group);
    }
    this.walls = [];
    this.group = null;
    this.bounds = null;
  }
}
