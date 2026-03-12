/**
 * Tipos para o EventsManager: contrato entre ViewerCore e o gestor de eventos.
 * Permite extrair a lógica de eventos sem expor toda a API do ViewerCore.
 */

import type * as THREE from "three";
import type { DoorWindowConfig } from "../../room/types";

export type RoomElementHit = {
  elementId: string;
  wallId: number;
  type: "door" | "window";
  config: DoorWindowConfig;
};

export type WallHit = {
  wallId: number;
  config: DoorWindowConfig;
  type: "door" | "window";
};

export interface IViewerEventEngine {
  getCanvas(): HTMLCanvasElement;
  getTransformControlsDragging(): boolean;
  getSuppressNextCanvasClick(): boolean;
  setSuppressNextCanvasClick(v: boolean): void;
  getHighlightEnabled(): boolean;
  getHighlightManager(): {
    setSelected(mesh: THREE.Mesh | null): void;
    setHovered(mesh: THREE.Mesh | null): void;
    getSelectableMeshFromIntersects(hits: THREE.Intersection[]): THREE.Mesh | null;
  } | null;
  getHighlightIntersects(event: { clientX: number; clientY: number }): THREE.Intersection[];
  getBoxIdByMesh(mesh: THREE.Object3D): string | null;
  setSelectedBox(id: string | null, options?: { shiftKey?: boolean }): void;
  setHoveredBox(id: string | null): void;
  getOnRoomElementSelected(): ((data: RoomElementHit | null) => void) | null;
  getOnWallSelected(): ((wallId: number | null) => void) | null;
  getOnBoxSelected(): ((id: string | null, options?: { shiftKey?: boolean }) => void) | null;
  getPlacementMode(): "door" | "window" | null;
  getOnRoomElementPlaced(): ((wallId: number, config: DoorWindowConfig, type: "door" | "window") => void) | null;
  getWallHitAtPointer(event: { clientX: number; clientY: number }): WallHit | null;
  getRoomBuilder(): {
    addDoorByIndex(wallIndex: number, config: DoorWindowConfig): string;
    addWindowByIndex(wallIndex: number, config: DoorWindowConfig): string;
    getGroup(): THREE.Group;
  };
  setPlacementMode(mode: "door" | "window" | null): void;
  getBoxIdAtPointer(event: { clientX: number; clientY: number }): string | null;
  getSelectedBoxId(): string | null;
  getRoomElementAtPointer(event: { clientX: number; clientY: number }): RoomElementHit | null;
  getSelectedWallIndex(): number | null;
  setSelectedWallIndex(v: number | null): void;
  getSelectedRoomElementId(): string | null;
  setSelectedRoomElementId(v: string | null): void;
  refreshTransformControlsAttachment(): void;
  refreshOutlineTarget(): void;
  getRoomBoxWalls(): { id: number; mesh: THREE.Mesh }[];
  getWallGizmo(): {
    onPointerDown(x: number, y: number): boolean;
    onPointerUp(): void;
    detach(): void;
    attach(wall: THREE.Mesh): void;
  } | null;
  getWallEditMode(): boolean;
  getWallIdAtPointer(event: { clientX: number; clientY: number }): number | null;
  logTransformDiagnostic(name: string, data?: Record<string, unknown>): void;
  getTransformGizmoIntersections(event: { clientX: number; clientY: number }): number;
  getWallGizmoDragging(): boolean;
  setWallGizmoDragging(v: boolean): void;
  getDoorHitAtPointer(event: { clientX: number; clientY: number }): { boxId: string; doorLayerId: string } | null;
  getOnDoorLayerDoubleClick(): ((boxId: string, doorLayerId: string) => void) | null;
  /** Desativa/ativa OrbitControls. Deve ser false enquanto o utilizador arrasta um gizmo (TransformControls ou WallGizmo). */
  setCameraControlsEnabled(enabled: boolean): void;
}
