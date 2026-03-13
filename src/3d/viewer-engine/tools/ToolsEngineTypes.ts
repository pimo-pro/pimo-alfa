/**
 * Contrato do engine para ViewerTools (TransformControls, outline, clamp).
 */

import type * as THREE from "three";
import type { TransformMode } from "../state";

export interface IViewerToolsEngine {
  getTransformControls(): { attach(_mesh: THREE.Object3D): void; detach(): void; setMode(_mode: string): void; setSize(_size: number): void } | null;
  getTransformControlsHelper(): THREE.Object3D | null;
  getCurrentTool(): TransformMode;
  getSelectedBoxId(): string | null;
  getBoxEntry(_id: string): { mesh: THREE.Object3D; width: number; height: number; depth: number; locked?: boolean } | undefined;
  getSelectedWallIndex(): number | null;
  getRoomBoxWalls(): { id: number; mesh: THREE.Mesh }[];
  getSelectedRoomElementId(): string | null;
  getRoomElementById(_id: string): THREE.Object3D | null;
  getTransformGizmoSizeForBox(_entry: { width: number; height: number; depth: number }): number;
  setTransformHelperVisible(_visible: boolean): void;
  applyTransformControlsMouseGuard(): void;
  logTransformDiagnostic(_name: string, _data?: Record<string, unknown>): void;
  getSelectionOutline(): THREE.BoxHelper | null;
  getSelectionOutlineMaterial(): THREE.LineBasicMaterial | null;
  getHoveredBoxId(): string | null;
  getBoxesIntersectingWalls(): Set<string>;
  setOutlineTarget(_mesh: THREE.Object3D | null, _opacity: number, _colorHex: number): void;
  /** Chamado pelo ViewerTools após arraste (translate/rotate). Mantido no Core por dependências (collision, snap, room). */
  clampTransform(): void;
}
