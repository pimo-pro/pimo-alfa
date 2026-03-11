/**
 * Lógica de ferramentas do Viewer Engine (TransformControls, outline, move/rotate).
 * Centraliza attachment do gizmo e atualização do outline; delega clamp ao engine.
 */

import type { IViewerToolsEngine } from "./ToolsEngineTypes";

export class ViewerTools {
  private readonly engineOrGetter: IViewerToolsEngine | (() => IViewerToolsEngine);
  private getEngine(): IViewerToolsEngine {
    return typeof this.engineOrGetter === "function" ? this.engineOrGetter() : this.engineOrGetter;
  }
  constructor(engineOrGetter: IViewerToolsEngine | (() => IViewerToolsEngine)) {
    this.engineOrGetter = engineOrGetter;
  }

  /** Anexa ou desanexa TransformControls conforme seleção (caixa, parede ou abertura). */
  updateTransformControlsAttachment(): void {
    const e = this.getEngine();
    const controls = e.getTransformControls();
    if (!controls) return;
    const mode = e.getCurrentTool();
    const selectedBoxId = e.getSelectedBoxId();
    if (selectedBoxId && mode) {
      const entry = e.getBoxEntry(selectedBoxId);
      if (entry) {
        if (entry.locked) {
          controls.detach();
          e.applyTransformControlsMouseGuard();
          e.logTransformDiagnostic("detach-box-locked", { boxId: selectedBoxId });
          e.setTransformHelperVisible(false);
          return;
        }
        entry.mesh.matrixAutoUpdate = true;
        entry.mesh.updateMatrixWorld(true);
        controls.detach();
        controls.attach(entry.mesh);
        controls.setMode(mode);
        controls.setSize(e.getTransformGizmoSizeForBox(entry));
        e.applyTransformControlsMouseGuard();
        e.logTransformDiagnostic("attach-box", { boxId: selectedBoxId, attachedUuid: entry.mesh.uuid });
        e.setTransformHelperVisible(true);
        return;
      }
    }
    if (e.getSelectedWallIndex() !== null && mode) {
      const wall = e.getRoomBoxWalls().find((w) => w.id === e.getSelectedWallIndex())?.mesh;
      if (wall) {
        controls.detach();
        e.applyTransformControlsMouseGuard();
        e.logTransformDiagnostic("detach-wall-selected", { wallId: e.getSelectedWallIndex() });
        e.setTransformHelperVisible(false);
        return;
      }
    }
    const selectedRoomElementId = e.getSelectedRoomElementId();
    if (selectedRoomElementId && mode) {
      const element = e.getRoomElementById(selectedRoomElementId);
      if (element) {
        element.matrixAutoUpdate = true;
        element.updateMatrixWorld(true);
        controls.detach();
        controls.attach(element);
        controls.setMode(mode);
        controls.setSize(0.65);
        e.applyTransformControlsMouseGuard();
        e.logTransformDiagnostic("attach-room-element", { elementId: selectedRoomElementId, attachedUuid: element.uuid });
        e.setTransformHelperVisible(true);
        return;
      }
    }
    controls.detach();
    e.applyTransformControlsMouseGuard();
    e.logTransformDiagnostic("detach-none", { reason: "no-selected-target-or-transform-mode" });
    e.setTransformHelperVisible(false);
  }

  /** Atualiza o outline de seleção/hover (cor e visibilidade). */
  updateOutline(): void {
    const e = this.getEngine();
    const outline = e.getSelectionOutline();
    const material = e.getSelectionOutlineMaterial();
    if (!outline || !material) return;
    const targetId = e.getSelectedBoxId() ?? e.getHoveredBoxId();
    if (!targetId) {
      e.setOutlineTarget(null, 0, 0);
      return;
    }
    const entry = e.getBoxEntry(targetId);
    if (!entry) {
      e.setOutlineTarget(null, 0, 0);
      return;
    }
    const isSelected = targetId === e.getSelectedBoxId();
    const opacity = isSelected ? 0.9 : 0.55;
    const intersectsWall = e.getBoxesIntersectingWalls().has(targetId);
    const colorHex = intersectsWall ? 0xef4444 : (isSelected ? 0x38bdf8 : 0x7dd3fc);
    e.setOutlineTarget(entry.mesh, opacity, colorHex);
  }

  /** Aplica o clamp atual (translate/rotate) após arraste; delega ao engine. */
  applyCurrentTool(): void {
    this.getEngine().clampTransform();
  }

  applyMoveTool(): void {
    this.getEngine().clampTransform();
  }

  applyRotateTool(): void {
    this.getEngine().clampTransform();
  }

  applyScaleTool(): void {
    this.getEngine().clampTransform();
  }

  applyPlacementTool(): void {
    // Placement é tratado nos eventos (EventsManager); não há clamp específico.
  }

  applyWallEditTool(): void {
    this.getEngine().clampTransform();
  }

  applyRoomEditTool(): void {
    this.getEngine().clampTransform();
  }
}
