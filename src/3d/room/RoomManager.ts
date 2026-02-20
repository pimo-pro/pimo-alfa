import * as THREE from "three";
import { Room, DEFAULT_ROOM_WIDTH, DEFAULT_ROOM_DEPTH, DEFAULT_ROOM_HEIGHT } from "./Room";
import {
  createMainWalls,
  createExtraWall,
  positionMainWalls,
  WALL_THICKNESS_M,
} from "./WallFactory";

export type RoomBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerZ: number;
};

export type WallEntryForViewer = {
  id: number;
  normal: THREE.Vector3;
  mesh: THREE.Mesh;
};

/**
 * Interface mínima que o Viewer deve implementar para integração com o RoomManager.
 * Evita dependência circular Viewer -> RoomManager -> Viewer.
 */
export interface IRoomManagerViewer {
  setRoomFromManager(
    walls: WallEntryForViewer[],
    bounds: RoomBounds,
    group: THREE.Group
  ): void;
  clearRoomFromManager(): void;
}

/**
 * Gestor da sala única: dimensões, 4 paredes principais, paredes extras, piso, lock e visibilidade.
 */
export class RoomManager {
  room: Room | null = null;
  wallsMain: THREE.Mesh[] = [];
  wallsExtra: THREE.Mesh[] = [];
  floor: THREE.Mesh | null = null;
  /** Grupo que contém todas as paredes e o piso; adicionado à cena pelo Viewer. */
  group: THREE.Group;
  locked = false;
  private _visible = true;
  private nextExtraWallId = 4;
  private viewer: IRoomManagerViewer;

  constructor(viewer: IRoomManagerViewer) {
    this.viewer = viewer;
    this.group = new THREE.Group();
    this.group.name = "roomManager";
  }

  createRoom(
    width = DEFAULT_ROOM_WIDTH,
    depth = DEFAULT_ROOM_DEPTH,
    height = DEFAULT_ROOM_HEIGHT
  ): void {
    this.removeRoom();
    this.room = new Room(width, depth, height);
    this.wallsMain = createMainWalls(this.room);
    this.wallsExtra = [];
    this.nextExtraWallId = 4;
    this.group.clear();

    this.wallsMain.forEach((mesh) => this.group.add(mesh));
    this.updateFloor();
    if (this.floor) this.group.add(this.floor);

    const bounds = this.getBounds();
    if (bounds) this.viewer.setRoomFromManager(this.getWallsForViewer(), bounds, this.group);
  }

  removeRoom(): void {
    this.viewer.clearRoomFromManager();

    [...this.wallsMain, ...this.wallsExtra].forEach((w) => {
      w.geometry.dispose();
      if (!Array.isArray(w.material)) (w.material as THREE.Material).dispose();
    });
    this.wallsMain = [];
    this.wallsExtra = [];

    if (this.floor) {
      this.floor.geometry.dispose();
      if (!Array.isArray(this.floor.material)) {
        (this.floor.material as THREE.Material).dispose();
      }
      this.floor = null;
    }

    this.group.clear();
    this.room = null;
  }

  setDimensions(width: number, depth: number, height: number): void {
    if (!this.room) return;
    this.room.width = Math.max(0.1, width);
    this.room.depth = Math.max(0.1, depth);
    this.room.height = Math.max(0.1, height);
    this.updateFloor();
    positionMainWalls(this.room, this.wallsMain);
    const bounds = this.getBounds();
    if (bounds) this.viewer.setRoomFromManager(this.getWallsForViewer(), bounds, this.group);
  }

  addExtraWall(): THREE.Mesh {
    const id = this.nextExtraWallId++;
    const wall = createExtraWall(id);
    this.wallsExtra.push(wall);
    this.group.add(wall);
    const bounds = this.getBounds();
    if (bounds) this.viewer.setRoomFromManager(this.getWallsForViewer(), bounds, this.group);
    return wall;
  }

  setLocked(flag: boolean): void {
    this.locked = flag;
  }

  updateFloor(): void {
    if (!this.room) return;
    if (this.floor) {
      this.floor.geometry.dispose();
      if (!Array.isArray(this.floor.material)) {
        (this.floor.material as THREE.Material).dispose();
      }
      this.group.remove(this.floor);
    }
    const floorGeom = new THREE.PlaneGeometry(this.room.width, this.room.depth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xe5e7eb,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    this.floor = new THREE.Mesh(floorGeom, floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set(this.room.centerX, 0, this.room.centerZ);
    this.floor.userData.isRoomFloor = true;
    this.group.add(this.floor);
  }

  getBounds(): RoomBounds | null {
    if (!this.room) return null;
    return {
      minX: this.room.minX,
      maxX: this.room.maxX,
      minZ: this.room.minZ,
      maxZ: this.room.maxZ,
      minY: this.room.minY,
      maxY: this.room.maxY,
      centerX: this.room.centerX,
      centerZ: this.room.centerZ,
    };
  }

  getWallsForViewer(): WallEntryForViewer[] {
    const main = this.wallsMain.map((mesh, i) => ({
      id: i,
      normal: (mesh.userData.wallNormal as THREE.Vector3).clone(),
      mesh,
    }));
    const extra = this.wallsExtra.map((mesh) => ({
      id: mesh.userData.wallId as number,
      normal: (mesh.userData.wallNormal as THREE.Vector3).clone(),
      mesh,
    }));
    return [...main, ...extra];
  }

  /**
   * Chamado quando uma parede principal é movida/rotacionada (ex.: pelo gizmo).
   * Se locked, recalcula o retângulo a partir da parede movida e reposiciona as 4 principais.
   */
  onMainWallTransformed(
    wallIndex: number,
    position: { x: number; z: number },
    _rotationDeg: number
  ): void {
    if (!this.room || !this.locked || wallIndex < 0 || wallIndex > 3) return;

    const t = WALL_THICKNESS_M;
    const { minX, maxX, minZ, maxZ } = this.room;

    switch (wallIndex) {
      case 0: {
        const newMinZ = position.z + t / 2;
        if (newMinZ >= maxZ - 0.2) return;
        this.room.originZ = newMinZ;
        this.room.depth = maxZ - newMinZ;
        break;
      }
      case 1: {
        const newMaxX = position.x - t / 2;
        if (newMaxX <= minX + 0.2) return;
        this.room.width = newMaxX - minX;
        break;
      }
      case 2: {
        const newMaxZ = position.z - t / 2;
        if (newMaxZ <= minZ + 0.2) return;
        this.room.depth = newMaxZ - minZ;
        this.room.originZ = minZ;
        break;
      }
      case 3: {
        const newMinX = position.x + t / 2;
        if (newMinX >= maxX - 0.2) return;
        this.room.originX = newMinX;
        this.room.width = maxX - newMinX;
        break;
      }
    }

    positionMainWalls(this.room, this.wallsMain);
    this.updateFloor();
    const bounds = this.getBounds();
    if (bounds) this.viewer.setRoomFromManager(this.getWallsForViewer(), bounds, this.group);
  }

  hideRoom(): void {
    this._visible = false;
    this.group.visible = false;
    if (this.floor) this.floor.visible = false;
  }

  showRoom(): void {
    this._visible = true;
    this.group.visible = true;
    if (this.floor) this.floor.visible = true;
  }

  get visible(): boolean {
    return this._visible;
  }

  updateCamera(): void {
    const bounds = this.getBounds();
    if (bounds) this.viewer.setRoomFromManager(this.getWallsForViewer(), bounds, this.group);
  }
}
