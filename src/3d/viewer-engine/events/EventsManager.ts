/**
 * Gestão centralizada de eventos do Viewer Engine (canvas: click, pointer, etc.).
 * Toda a lógica de handlers de mouse/pointer foi extraída do ViewerCore.
 */

import { getPointerNdc } from "../utils";
import type { IViewerEventEngine } from "./EventEngineTypes";

export class EventsManager {
  private readonly engine: IViewerEventEngine;
  private canvas: HTMLCanvasElement | null = null;
  /** True enquanto o utilizador arrasta o gizmo de transformação (mover/rodar caixa) ou o wall gizmo. */
  private isDraggingGizmo = false;
  /** True quando o pointerdown foi fora do gizmo (arrastar = orbit/pan câmera). */
  private isDraggingCamera = false;
  private boundHandlers: {
    click: (event: MouseEvent) => void;
    dblclick: (event: MouseEvent) => void;
    pointerdown: (event: PointerEvent) => void;
    pointermove: (event: PointerEvent) => void;
    pointerup: (event: PointerEvent) => void;
    pointerleave: () => void;
  } | null = null;

  constructor(engine: IViewerEventEngine) {
    this.engine = engine;
    this.boundHandlers = {
      click: this.handleCanvasClick.bind(this),
      dblclick: this.handleCanvasDoubleClick.bind(this),
      pointerdown: this.handleCanvasPointerDown.bind(this),
      pointermove: this.handleCanvasPointerMove.bind(this),
      pointerup: this.handleCanvasPointerUp.bind(this),
      pointerleave: this.handleCanvasPointerLeave.bind(this),
    };
  }

  /** Regista os listeners no canvas. Deve ser chamado após o canvas estar disponível. */
  register(canvas: HTMLCanvasElement): void {
    if (this.canvas === canvas) return;
    this.unregister();
    this.canvas = canvas;
    const h = this.boundHandlers!;
    canvas.addEventListener("click", h.click);
    canvas.addEventListener("dblclick", h.dblclick);
    canvas.addEventListener("pointerdown", h.pointerdown, true);
    canvas.addEventListener("pointermove", h.pointermove);
    canvas.addEventListener("pointerup", h.pointerup);
    canvas.addEventListener("pointerleave", h.pointerleave);
  }

  /** Remove os listeners do canvas. */
  unregister(): void {
    if (!this.canvas || !this.boundHandlers) return;
    const h = this.boundHandlers;
    this.canvas.removeEventListener("click", h.click);
    this.canvas.removeEventListener("dblclick", h.dblclick);
    this.canvas.removeEventListener("pointerdown", h.pointerdown, true);
    this.canvas.removeEventListener("pointermove", h.pointermove);
    this.canvas.removeEventListener("pointerup", h.pointerup);
    this.canvas.removeEventListener("pointerleave", h.pointerleave);
    this.canvas = null;
  }

  private handleCanvasClick(event: MouseEvent): void {
    const e = this.engine;
    if (e.getTransformControlsDragging()) return;
    if (e.getSuppressNextCanvasClick()) {
      e.setSuppressNextCanvasClick(false);
      return;
    }
    if (e.getHighlightEnabled() && e.getHighlightManager()) {
      const hits = e.getHighlightIntersects(event);
      const mesh = e.getHighlightManager()!.getSelectableMeshFromIntersects(hits);
      if (mesh) {
        e.getHighlightManager()!.setSelected(mesh);
        const boxId = e.getBoxIdByMesh(mesh);
        if (boxId != null) e.setSelectedBox(boxId);
        e.getOnRoomElementSelected()?.(null);
        e.getOnWallSelected()?.(null);
        return;
      }
    }
    if (e.getPlacementMode() && e.getOnRoomElementPlaced()) {
      const hit = e.getWallHitAtPointer(event);
      if (hit) {
        if (hit.type === "door") {
          e.getRoomBuilder().addDoorByIndex(hit.wallId, hit.config);
        } else {
          e.getRoomBuilder().addWindowByIndex(hit.wallId, hit.config);
        }
        e.getOnRoomElementPlaced()!(hit.wallId, hit.config, hit.type);
        e.setPlacementMode(null);
      }
      return;
    }
    const boxId = e.getBoxIdAtPointer(event);
    if (boxId) {
      e.setHoveredBox(boxId);
      e.setSelectedBox(boxId);
      e.getOnRoomElementSelected()?.(null);
      e.getOnWallSelected()?.(null);
      return;
    }
    const roomHit = e.getRoomElementAtPointer(event);
    if (roomHit) {
      e.setHoveredBox(null);
      e.setSelectedBox(null);
      e.setSelectedWallIndex(null);
      e.setSelectedRoomElementId(roomHit.elementId);
      e.refreshTransformControlsAttachment();
      e.refreshOutlineTarget();
      e.getOnBoxSelected()?.(null);
      e.getOnRoomElementSelected()?.(roomHit);
      e.getOnWallSelected()?.(null);
      return;
    }
    const wallId = e.getWallIdAtPointer(event);
    if (wallId !== null) {
      e.setHoveredBox(null);
      e.setSelectedBox(null);
      e.setSelectedWallIndex(wallId);
      e.setSelectedRoomElementId(null);
      const wall = e.getRoomBoxWalls().find((w) => w.id === wallId)?.mesh;
      const wallGizmo = e.getWallGizmo();
      if (wallGizmo && wall && e.getWallEditMode()) wallGizmo.attach(wall);
      e.refreshTransformControlsAttachment();
      e.refreshOutlineTarget();
      e.getOnBoxSelected()?.(null);
      e.getOnRoomElementSelected()?.(null);
      e.getOnWallSelected()?.(wallId);
      return;
    }
    e.setHoveredBox(null);
    e.setSelectedBox(null);
    e.setSelectedWallIndex(null);
    e.setSelectedRoomElementId(null);
    const wallGizmo = e.getWallGizmo();
    if (wallGizmo) wallGizmo.detach();
    e.refreshTransformControlsAttachment();
    e.refreshOutlineTarget();
    e.getOnBoxSelected()?.(null);
    e.getOnRoomElementSelected()?.(null);
    e.getOnWallSelected()?.(null);
  }

  private handleCanvasPointerDown(event: PointerEvent): void {
    const e = this.engine;
    if (import.meta.env.DEV && event.button === 2) {
      console.log("[DOOR-MAT] handleCanvasPointerDown — botão direito (context menu virá a seguir)", {
        clientX: event.clientX,
        clientY: event.clientY,
      });
    }
    e.logTransformDiagnostic("pointerDown", {
      pointerType: event.pointerType,
      button: event.button,
      clientX: event.clientX,
      clientY: event.clientY,
    });

    if (event.button === 0) {
      const transformGizmoHits = e.getTransformGizmoIntersections(event);
      if (transformGizmoHits > 0) {
        this.isDraggingGizmo = true;
        this.isDraggingCamera = false;
        e.setCameraControlsEnabled(false);
        return;
      }
      this.isDraggingCamera = true;
      this.isDraggingGizmo = false;
    }

    if (event.button === 0 && e.getHighlightEnabled() && e.getHighlightManager()) {
      const hits = e.getHighlightIntersects(event);
      const mesh = e.getHighlightManager()!.getSelectableMeshFromIntersects(hits);
      if (mesh) {
        event.preventDefault();
        event.stopPropagation();
        e.getHighlightManager()!.setSelected(mesh);
        const boxId = e.getBoxIdByMesh(mesh);
        if (boxId != null) e.setSelectedBox(boxId);
        e.getOnRoomElementSelected()?.(null);
        e.getOnWallSelected()?.(null);
        e.setSuppressNextCanvasClick(true);
        return;
      }
    }
    if (event.button === 0) {
      const boxId = e.getBoxIdAtPointer(event);
      if (boxId != null && boxId !== e.getSelectedBoxId()) {
        const previousSelected = e.getSelectedBoxId();
        event.preventDefault();
        event.stopPropagation();
        e.setHoveredBox(boxId);
        e.setSelectedBox(boxId);
        e.getOnRoomElementSelected()?.(null);
        e.getOnWallSelected()?.(null);
        e.logTransformDiagnostic("box-selected-pointerDown-other-box", {
          boxId,
          previousSelected,
        });
        return;
      }
      if (boxId != null) {
        e.setHoveredBox(boxId);
        e.setSelectedBox(boxId);
        e.getOnRoomElementSelected()?.(null);
        e.getOnWallSelected()?.(null);
        e.logTransformDiagnostic("box-selected-pointerDown", { boxId });
      }
    }
    if (e.getSelectedWallIndex() === null || !e.getWallGizmo()) {
      this.isDraggingCamera = true;
      this.isDraggingGizmo = false;
      return;
    }
    const canvas = e.getCanvas();
    const { x, y } = getPointerNdc(canvas, event);
    if (e.getWallGizmo()!.onPointerDown(x, y)) {
      e.setWallGizmoDragging(true);
      this.isDraggingGizmo = true;
      this.isDraggingCamera = false;
      e.setCameraControlsEnabled(false);
    } else {
      this.isDraggingCamera = true;
      this.isDraggingGizmo = false;
    }
  }

  private handleCanvasDoubleClick(event: MouseEvent): void {
    if (event.button !== 0) return;
    const hit = this.engine.getDoorHitAtPointer(event);
    if (!hit) return;
    event.preventDefault();
    event.stopPropagation();
    this.engine.getOnDoorLayerDoubleClick()?.(hit.boxId, hit.doorLayerId);
  }

  private handleCanvasPointerUp(event: PointerEvent): void {
    const e = this.engine;
    e.logTransformDiagnostic("pointerUp", {
      pointerType: event.pointerType,
      button: event.button,
      clientX: event.clientX,
      clientY: event.clientY,
      gizmoHits: e.getTransformGizmoIntersections(event),
    });
    if (e.getWallGizmoDragging() && e.getWallGizmo()) {
      e.getWallGizmo()!.onPointerUp();
      e.setWallGizmoDragging(false);
    }
    this.isDraggingGizmo = false;
    this.isDraggingCamera = false;
    e.setCameraControlsEnabled(true);
  }

  private handleCanvasPointerMove(event: PointerEvent): void {
    const e = this.engine;
    if (this.isDraggingGizmo) return;
    if (this.isDraggingCamera) return;
    e.logTransformDiagnostic("pointerMove", {
      pointerType: event.pointerType,
      buttons: event.buttons,
      clientX: event.clientX,
      clientY: event.clientY,
      gizmoHits: e.getTransformGizmoIntersections(event),
    });
    if (e.getTransformControlsDragging()) return;
    if (e.getHighlightEnabled() && e.getHighlightManager()) {
      const hits = e.getHighlightIntersects(event);
      const mesh = e.getHighlightManager()!.getSelectableMeshFromIntersects(hits);
      e.getHighlightManager()!.setHovered(mesh);
      const boxId = mesh ? e.getBoxIdByMesh(mesh) : null;
      e.setHoveredBox(boxId);
      return;
    }
    const id = e.getBoxIdAtPointer(event);
    e.setHoveredBox(id);
  }

  private handleCanvasPointerLeave(): void {
    const e = this.engine;
    this.isDraggingGizmo = false;
    this.isDraggingCamera = false;
    e.setCameraControlsEnabled(true);
    if (e.getHighlightEnabled() && e.getHighlightManager()) {
      e.getHighlightManager()!.setHovered(null);
    }
    e.setHoveredBox(null);
  }
}
