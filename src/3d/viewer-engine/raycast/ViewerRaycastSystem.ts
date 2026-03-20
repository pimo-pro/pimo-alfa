import * as THREE from "three";
import type { DoorWindowConfig } from "../../room/types";
import type { ViewerBoxEntry } from "../types";
import { getPointerNdc } from "../utils";
import { devLogger } from "../../../utils/devLogger";

/** Limites da sala (m) usados por getWallIdInFrontOfCamera — espelha o campo em ViewerCore. */
export type ViewerRaycastRoomBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerZ: number;
};

/**
 * Dependências injetadas pelo ViewerCore (sem duplicar estado).
 * Inclui getters pedidos explicitamente; getCanvas / getRoomBounds / getTransformControlsHelper / getDebugMode
 * são necessários para manter o picking idêntico ao código original.
 */
export type ViewerRaycastSystemDeps = {
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  camera: THREE.Camera;
  getBoxes: () => Map<string, ViewerBoxEntry>;
  getRoomBoxWalls: () => Array<{ id: number; normal: THREE.Vector3; mesh: THREE.Mesh }>;
  getRoomBuilderGroup: () => THREE.Group;
  getScene: () => THREE.Scene;
  getCanvas: () => HTMLCanvasElement;
  getRoomBounds: () => ViewerRaycastRoomBounds | null;
  getTransformControlsHelper: () => THREE.Object3D | null;
  getDebugMode: () => boolean;
};

/**
 * Sistema de raycast/picking extraído do ViewerCore.
 * Reutiliza o mesmo Raycaster e Vector2 do core (não cria instâncias novas).
 */
export class ViewerRaycastSystem {
  constructor(private readonly deps: ViewerRaycastSystemDeps) {}

  getTransformGizmoIntersections(event: { clientX: number; clientY: number }): number {
    const helper = this.deps.getTransformControlsHelper();
    if (!helper || !helper.visible) return 0;
    const { x, y } = getPointerNdc(this.deps.getCanvas(), event);
    this.deps.pointer.set(x, y);
    this.deps.raycaster.setFromCamera(this.deps.pointer, this.deps.camera);
    return this.deps.raycaster.intersectObject(helper, true).length;
  }

  /** Raízes para raycaster do highlight (caixas + sala). */
  private getHighlightRaycastRoots(): THREE.Object3D[] {
    const roots: THREE.Object3D[] = [];
    this.deps.getBoxes().forEach((entry) => roots.push(entry.mesh));
    roots.push(this.deps.getRoomBuilderGroup());
    return roots;
  }

  getHighlightIntersects(event: { clientX: number; clientY: number }): THREE.Intersection[] {
    const canvas = this.deps.getCanvas();
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return [];
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.deps.pointer.set(x, y);
    this.deps.raycaster.setFromCamera(this.deps.pointer, this.deps.camera);
    this.deps.raycaster.layers.set(0);
    const roots = this.getHighlightRaycastRoots();
    return this.deps.raycaster.intersectObjects(roots, true);
  }

  /** Obtém boxId a partir de um mesh (grupo ou filho/GLB); sobe na hierarquia até encontrar userData.boxId ou o grupo da caixa. */
  getBoxIdByMesh(mesh: THREE.Object3D): string | null {
    const boxes = this.deps.getBoxes();
    let current: THREE.Object3D | null = mesh;
    while (current) {
      const boxId = current.userData?.boxId as string | undefined;
      if (boxId && boxes.has(boxId)) return boxId;
      for (const [id, entry] of boxes.entries()) {
        if (entry.mesh === current) return id;
      }
      current = current.parent;
    }
    return null;
  }

  /** Obtém doorLayerId subindo na hierarquia (mesh → pivot door-layer-* → …). Usado por getContextMenuLayerHit e getDoorHitAtPointer. */
  private getDoorLayerIdByMesh(mesh: THREE.Object3D): string | null {
    let current: THREE.Object3D | null = mesh;
    while (current) {
      const doorLayerId = current.userData?.doorLayerId;
      if (typeof doorLayerId === "string" && doorLayerId.length > 0) {
        return doorLayerId;
      }
      current = current.parent;
    }
    return null;
  }

  private getDrawerLayerIdByMesh(mesh: THREE.Object3D): string | null {
    let current: THREE.Object3D | null = mesh;
    while (current) {
      const drawerLayerId = current.userData?.drawerLayerId;
      if (typeof drawerLayerId === "string" && drawerLayerId.length > 0) {
        return drawerLayerId;
      }
      current = current.parent;
    }
    return null;
  }

  getBoxIdAtPointer(event: { clientX: number; clientY: number }) {
    const canvas = this.deps.getCanvas();
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.deps.pointer.set(x, y);
    this.deps.raycaster.setFromCamera(this.deps.pointer, this.deps.camera);
    this.deps.raycaster.layers.set(0);
    const roots: THREE.Object3D[] = [];
    const boxes = this.deps.getBoxes();
    boxes.forEach((entry) => {
      roots.push(entry.mesh);
    });
    const hits = this.deps.raycaster.intersectObjects(roots, true);
    if (!hits.length) return null;
    const firstHit = hits[0].object;
    const doorLayerIdAtPointer = this.getDoorLayerIdByMesh(firstHit);
    if (doorLayerIdAtPointer) {
      const boxIdFirst = this.getBoxIdByMesh(firstHit);
      const entry = boxIdFirst ? boxes.get(boxIdFirst) : undefined;
      const doorIndex = entry?.mesh
        ? entry.mesh.children.filter((c) => c.name.startsWith("door-layer-")).findIndex((c) => c.name === `door-layer-${doorLayerIdAtPointer}`)
        : -1;
      if (import.meta.env.DEV && this.deps.getDebugMode()) {
        devLogger.debug("[DOOR-MAT] getBoxIdAtPointer — primeiro hit é porta (clique simples)", {
          boxId: boxIdFirst,
          doorLayerId: doorLayerIdAtPointer,
          specId: doorLayerIdAtPointer,
          doorIndex,
          hitObjectName: firstHit.name,
        });
      }
    }
    return this.getBoxIdByMesh(firstHit);
  }

  getDoorHitAtPointer(event: { clientX: number; clientY: number }): { boxId: string; doorLayerId: string } | null {
    const canvas = this.deps.getCanvas();
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.deps.pointer.set(x, y);
    this.deps.raycaster.setFromCamera(this.deps.pointer, this.deps.camera);
    this.deps.raycaster.layers.set(0);
    const roots: THREE.Object3D[] = [];
    const boxes = this.deps.getBoxes();
    boxes.forEach((entry) => {
      roots.push(entry.mesh);
    });
    const hits = this.deps.raycaster.intersectObjects(roots, true);
    for (const hit of hits) {
      const doorLayerId = this.getDoorLayerIdByMesh(hit.object);
      if (!doorLayerId) continue;
      const boxId = this.getBoxIdByMesh(hit.object);
      if (!boxId) continue;
      const entry = boxes.get(boxId);
      const doorNames = entry?.mesh ? entry.mesh.children.filter((c) => c.name.startsWith("door-layer-")).map((c) => c.name) : [];
      const doorIndex = entry?.mesh
        ? entry.mesh.children.filter((c) => c.name.startsWith("door-layer-")).findIndex((c) => c.name === `door-layer-${doorLayerId}`)
        : -1;
      if (import.meta.env.DEV) {
        devLogger.debug("[DOOR-MAT] getDoorHitAtPointer (double-click/raycast)", {
          boxId,
          doorLayerId,
          specId: doorLayerId,
          doorIndex,
          doorNamesNoBox: doorNames,
          hitObjectName: hit.object.name,
        });
      }
      return { boxId, doorLayerId };
    }
    return null;
  }

  /**
   * Retorna o alvo do ponteiro para o menu de contexto: porta, gaveta ou null (módulo/canvas).
   * Raycast nos boxes; para o primeiro hit que tenha getDoorLayerIdByMesh ou getDrawerLayerIdByMesh, devolve boxId + type + doorLayerId/drawerLayerId.
   * Depende de userData.doorLayerId propagado em createDoorObject e de userData.boxId em applyPanelIdsToBox.
   */
  getContextMenuLayerHit(event: { clientX: number; clientY: number }): {
    boxId: string;
    type: "door" | "drawer";
    doorLayerId?: string;
    drawerLayerId?: string;
  } | null {
    const canvas = this.deps.getCanvas();
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.deps.pointer.set(x, y);
    this.deps.raycaster.setFromCamera(this.deps.pointer, this.deps.camera);
    this.deps.raycaster.layers.set(0);
    const roots: THREE.Object3D[] = [];
    const boxes = this.deps.getBoxes();
    boxes.forEach((entry) => {
      roots.push(entry.mesh);
    });
    const hits = this.deps.raycaster.intersectObjects(roots, true);
    for (const hit of hits) {
      const boxId = this.getBoxIdByMesh(hit.object);
      if (!boxId) continue;
      const doorLayerId = this.getDoorLayerIdByMesh(hit.object);
      if (doorLayerId) {
        const entry = boxes.get(boxId);
        const doorNames = entry?.mesh ? entry.mesh.children.filter((c) => c.name.startsWith("door-layer-")).map((c) => c.name) : [];
        const doorIndex = entry?.mesh
          ? entry.mesh.children.filter((c) => c.name.startsWith("door-layer-")).findIndex((c) => c.name === `door-layer-${doorLayerId}`)
          : -1;
        if (import.meta.env.DEV) {
          devLogger.debug("[DOOR-MAT] getContextMenuLayerHit — porta selecionada pelo raycaster (menu contexto)", {
            boxId,
            doorLayerId,
            specId: doorLayerId,
            doorIndex,
            doorNamesNoBox: doorNames,
            hitObjectName: hit.object.name,
            hitObjectUserDataDoorLayerId: (hit.object as THREE.Object3D & { userData: { doorLayerId?: string } }).userData?.doorLayerId,
          });
        }
        if (import.meta.env.DEV) {
          devLogger.debug("[getContextMenuLayerHit] porta clicada (enviado para o menu)", {
            boxId,
            doorLayerId,
            hitObjectName: hit.object.name,
            hitObjectUuid: hit.object.uuid,
            hitObjectUserDataDoorLayerId: (hit.object as THREE.Object3D & { userData: { doorLayerId?: string } }).userData?.doorLayerId,
          });
        }
        return { boxId, type: "door", doorLayerId };
      }
      const drawerLayerId = this.getDrawerLayerIdByMesh(hit.object);
      if (drawerLayerId) return { boxId, type: "drawer", drawerLayerId };
      return null;
    }
    return null;
  }

  getWallIdAtPointer(event: { clientX: number; clientY: number }): number | null {
    const roomMeshes = this.deps.getRoomBoxWalls().map((w) => w.mesh);
    if (!roomMeshes.length) return null;

    const canvas = this.deps.getCanvas();
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.deps.pointer.set(x, y);
    this.deps.raycaster.setFromCamera(this.deps.pointer, this.deps.camera);
    const hits = this.deps.raycaster.intersectObjects(roomMeshes, true);
    if (!hits.length) return null;

    let current: THREE.Object3D | null = hits[0].object;
    while (current) {
      const wallId = (current as THREE.Mesh & { userData?: { wallId?: number } }).userData?.wallId;
      if (typeof wallId === "number") return wallId;
      current = current.parent;
    }
    return null;
  }

  getWallIdInFrontOfCamera(): number | null {
    const roomBounds = this.deps.getRoomBounds();
    if (!roomBounds) return null;
    const cam = this.deps.camera;
    const centerY = (roomBounds.minY + roomBounds.maxY) / 2;
    const center = new THREE.Vector3(roomBounds.centerX, centerY, roomBounds.centerZ);
    const dir = center.clone().sub(cam.position);
    if (dir.lengthSq() < 1e-6) return null;
    const roomWalls = this.deps.getRoomBoxWalls().map((w) => w.mesh);
    if (!roomWalls.length) return null;
    this.deps.raycaster.set(cam.position, dir.normalize());
    const hits = this.deps.raycaster.intersectObjects(roomWalls, false);
    const hitWall = hits.length ? hits[0].object : null;
    if (!hitWall) return null;
    const entry = this.deps.getRoomBoxWalls().find((w) => w.mesh === hitWall);
    return entry?.id ?? null;
  }

  getRoomElementAtPointer(event: { clientX: number; clientY: number }): {
    elementId: string;
    wallId: number;
    type: "door" | "window";
    config: DoorWindowConfig;
  } | null {
    const roomGroup = this.deps.getRoomBuilderGroup();
    const roomMeshes: THREE.Object3D[] = [];
    roomGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData?.isRoomElement === true) {
        roomMeshes.push(child);
      }
    });
    if (!roomMeshes.length) return null;

    const canvas = this.deps.getCanvas();
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.deps.pointer.set(x, y);
    this.deps.raycaster.setFromCamera(this.deps.pointer, this.deps.camera);
    const hits = this.deps.raycaster.intersectObjects(roomMeshes, true);
    if (!hits.length) return null;

    let current: THREE.Object3D | null = hits[0].object;
    while (current) {
      const elementId = current.userData?.elementId as string | undefined;
      const elementType = current.userData?.elementType as "door" | "window" | undefined;
      const config = current.userData?.config as DoorWindowConfig | undefined;
      if (elementId && elementType && config) {
        const wall = current.parent;
        const wallId = wall?.userData?.wallId as number | undefined;
        if (typeof wallId === "number") {
          return { elementId, wallId, type: elementType, config: { ...config } };
        }
      }
      current = current.parent;
    }
    return null;
  }
}
