/**
 * Tipos para o EventsManager: contrato entre ViewerCore e o gestor de eventos.
 * Permite extrair a lógica de eventos sem expor toda a API do ViewerCore.
 */

import type * as THREE from "three";
import type { DoorWindowConfig } from "../../room/types";
import type { MouseButtonAction } from "../controls/MouseInputMapper";
import type { InternalSelectionState } from "../selection/internalSelectionTypes";

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
  setSuppressNextCanvasClick(_v: boolean): void;
  getHighlightEnabled(): boolean;
  getHighlightManager(): {
    setSelected(_mesh: THREE.Mesh | null): void;
    setHovered(_mesh: THREE.Mesh | null): void;
    getSelectableMeshFromIntersects(_hits: THREE.Intersection[]): THREE.Mesh | null;
  } | null;
  getHighlightIntersects(_event: { clientX: number; clientY: number }): THREE.Intersection[];
  getBoxIdByMesh(_mesh: THREE.Object3D): string | null;
  setSelectedBox(_id: string | null): void;
  setHoveredBox(_id: string | null): void;
  getOnRoomElementSelected(): ((_data: RoomElementHit | null) => void) | null;
  getOnWallSelected(): ((_wallId: number | null) => void) | null;
  getOnBoxSelected(): ((_id: string | null) => void) | null;
  getPlacementMode(): "door" | "window" | null;
  getOnRoomElementPlaced(): ((_wallId: number, _config: DoorWindowConfig, _type: "door" | "window") => void) | null;
  getWallHitAtPointer(_event: { clientX: number; clientY: number }): WallHit | null;
  getRoomBuilder(): {
    addDoorByIndex(_wallIndex: number, _config: DoorWindowConfig): string;
    addWindowByIndex(_wallIndex: number, _config: DoorWindowConfig): string;
    getGroup(): THREE.Group;
  };
  setPlacementMode(_mode: "door" | "window" | null): void;
  getBoxIdAtPointer(_event: { clientX: number; clientY: number }): string | null;
  getHematiIdAtPointer(_event: { clientX: number; clientY: number }): string | null;
  getRodapeIdAtPointer(_event: { clientX: number; clientY: number }): string | null;
  getRemateIdAtPointer(_event: { clientX: number; clientY: number }): string | null;
  selectHemati(_hematiId: string | null): void;
  selectRodape(_rodapeId: string | null): void;
  selectRemate(_remateId: string | null): void;
  getSelectedBoxId(): string | null;
  getRoomElementAtPointer(_event: { clientX: number; clientY: number }): RoomElementHit | null;
  getSelectedWallIndex(): number | null;
  setSelectedWallIndex(_v: number | null): void;
  getSelectedRoomElementId(): string | null;
  setSelectedRoomElementId(_v: string | null): void;
  refreshTransformControlsAttachment(): void;
  refreshOutlineTarget(): void;
  getRoomBoxWalls(): { id: number; mesh: THREE.Mesh }[];
  getWallGizmo(): {
    onPointerDown(_x: number, _y: number): boolean;
    onPointerUp(): void;
    detach(): void;
    attach(_wall: THREE.Mesh): void;
  } | null;
  getWallEditMode(): boolean;
  getWallIdAtPointer(_event: { clientX: number; clientY: number }): number | null;
  logTransformDiagnostic(_name: string, _data?: Record<string, unknown>): void;
  getTransformGizmoIntersections(_event: { clientX: number; clientY: number }): number;
  getWallGizmoDragging(): boolean;
  setWallGizmoDragging(_v: boolean): void;
  getDoorHitAtPointer(_event: { clientX: number; clientY: number }): { boxId: string; doorLayerId: string } | null;
  getOnDoorLayerDoubleClick(): ((_boxId: string, _doorLayerId: string) => void) | null;
  getPointerActionForButton(_button: number): MouseButtonAction | null;
  shouldBlockPointerDownForSelection(_button: number): boolean;
  /** Desativa/ativa OrbitControls. Deve ser false enquanto o utilizador arrasta um gizmo (TransformControls ou WallGizmo). */
  setCameraControlsEnabled(_enabled: boolean): void;
  getInternalSelectionEnabled(): boolean;
  getInternalSelectionHit(_event: { clientX: number; clientY: number }): InternalSelectionState | null;
  setInternalSelection(_selection: InternalSelectionState | null): void;
}
