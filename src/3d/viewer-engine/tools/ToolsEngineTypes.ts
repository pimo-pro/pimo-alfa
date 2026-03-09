/**
 * Contrato do engine para ViewerTools (TransformControls, outline, clamp).
 */

import type * as THREE from "three";
import type { TransformMode } from "../state";

export interface IViewerToolsEngine {
  getTransformControls(): { attach(mesh: THREE.Object3D): void; detach(): void; setMode(mode: string): void; setSize(size: number): void } | null;
  getTransformControlsHelper(): THREE.Object3D | null;
  getCurrentTool(): TransformMode;
  getSelectedBoxId(): string | null;
  getBoxEntry(id: string): { mesh: THREE.Object3D; width: number; height: number; depth: number } | undefined;
  getSelectedWallIndex(): number | null;
  getRoomBoxWalls(): { id: number; mesh: THREE.Mesh }[];
  getSelectedRoomElementId(): string | null;
  getRoomElementById(id: string): THREE.Object3D | null;
  getTransformGizmoSizeForBox(entry: { width: number; height: number; depth: number }): number;
  setTransformHelperVisible(visible: boolean): void;
  applyTransformControlsMouseGuard(): void;
  logTransformDiagnostic(name: string, data?: Record<string, unknown>): void;
  getSelectionOutline(): THREE.BoxHelper | null;
  getSelectionOutlineMaterial(): THREE.LineBasicMaterial | null;
  getHoveredBoxId(): string | null;
  getBoxesIntersectingWalls(): Set<string>;
  setOutlineTarget(mesh: THREE.Object3D | null, opacity: number, colorHex: number): void;
  /** Chamado pelo ViewerTools após arraste (translate/rotate). Mantido no Core por dependências (collision, snap, room). */
  clampTransform(): void;
}
