import * as THREE from "three";
import { snapToNearest } from "./RulerGeometry";
import { RulerLogic } from "./RulerLogic";
import type { RulerMode } from "./RulerState";
import { RulerUIOverlay } from "./RulerUIOverlay";

type RulerSystemDeps = {
  host: HTMLElement;
  getScene: () => THREE.Scene | null;
  getCamera: () => THREE.Camera | null;
  projectWorldToScreen: (_world: THREE.Vector3) => { x: number; y: number } | null;
  applyDistanceDeltaMm: (_delta: THREE.Vector3) => void;
  getMovableObjects: () => THREE.Object3D[];
  getMovableObjectById: (_boxId: string | null) => THREE.Object3D | null;
  getActiveBoxId: () => string | null;
};

export class RulerSystem {
  private deps: RulerSystemDeps;
  private logic: RulerLogic;
  private overlay: RulerUIOverlay;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private raf: number | null = null;
  private enabled = true;
  private lastRaycastHitObject: THREE.Object3D | null = null;
  private draggingOff = false;
  private lastRenderedMeasurements: Array<{
    start: THREE.Vector3;
    end: THREE.Vector3;
    valueMm: number;
    color: string;
    type: "horizontal" | "vertical" | "diagonal";
    label?: string;
  }> = [];

  constructor(deps: RulerSystemDeps) {
    this.deps = deps;
    this.logic = new RulerLogic({ applyDistanceDeltaMm: deps.applyDistanceDeltaMm });
    this.overlay = new RulerUIOverlay({
      host: deps.host,
      project: deps.projectWorldToScreen,
      getCamera: deps.getCamera,
    });
    deps.host.addEventListener("pointerdown", this.onPointerDown, { capture: true, passive: true });
    deps.host.addEventListener("pointermove", this.onPointerMove, { capture: true, passive: true });
    deps.host.addEventListener("pointerup", this.onPointerUp, { capture: true, passive: true });
    deps.host.addEventListener("dblclick", this.onLabelDoubleClick, { capture: true });
    this.loop();
  }

  private getPointFromEvent(event: PointerEvent): THREE.Vector3 | null {
    const scene = this.deps.getScene();
    const camera = this.deps.getCamera();
    if (!scene || !camera) return null;
    const rect = this.deps.host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, camera);
    const hits = this.raycaster.intersectObjects(scene.children, true);
    this.lastRaycastHitObject = hits[0]?.object ?? null;
    if (hits[0]?.point) return hits[0].point.clone();
    const fallbackY = this.logic.state.startPoint?.y ?? 0;
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -fallbackY);
    const planeHit = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(dragPlane, planeHit) ? planeHit.clone() : null;
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    if (this.logic.state.mode === "OFF") {
      this.getPointFromEvent(event);
      if (!this.lastRaycastHitObject) {
        this.draggingOff = false;
        this.logic.clearAutoMeasurement();
        this.overlay.clear();
      }
      return;
    }
    if (this.logic.state.mode !== "ON") return;
    const scene = this.deps.getScene();
    const point = this.getPointFromEvent(event);
    if (!scene || !point) return;
    const snap = snapToNearest(point, scene);
    // Sem preventDefault/stopPropagation: Viewer mantém drag/orbit normais.
    this.logic.handlePointerDown(snap.point, snap.anchor);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.enabled) return;
    if (this.logic.state.mode === "OFF") {
      if (event.buttons === 0) return;
      this.draggingOff = true;
      const movingId = this.deps.getActiveBoxId();
      const moving = this.deps.getMovableObjectById(movingId);
      if (!moving) return;
      this.logic.updateAutoDistance(moving, this.deps.getMovableObjects());
      return;
    }
    if (this.logic.state.mode !== "ON") return;
    const scene = this.deps.getScene();
    const point = this.getPointFromEvent(event);
    if (!scene || !point) return;
    const snap = snapToNearest(point, scene);
    // Apenas leitura de evento; não bloquear fluxo do Viewer.
    this.logic.handlePointerMove(snap.point, snap.anchor);
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.enabled) return;
    if (this.logic.state.mode === "OFF") {
      void event;
      this.draggingOff = false;
      this.logic.clearAutoMeasurement();
      this.overlay.clear();
      return;
    }
    if (this.logic.state.mode !== "ON") return;
    const scene = this.deps.getScene();
    const point = this.getPointFromEvent(event);
    if (!scene || !point) return;
    const snap = snapToNearest(point, scene);
    this.logic.handlePointerUp(snap.point, snap.anchor);
  };

  private onLabelDoubleClick = (event: MouseEvent): void => {
    const id = this.overlay.getLabelAt(event.clientX, event.clientY);
    if (!id) return;
    const idx = Number.parseInt(id.replace("label-", ""), 10);
    if (!Number.isFinite(idx) || idx < 0) return;
    const measurement = this.lastRenderedMeasurements[idx];
    if (!measurement || measurement.type !== "vertical") return;
    const value = window.prompt("Novo valor (mm):");
    if (!value) return;
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const deltaY = parsed - measurement.valueMm;
    this.deps.applyDistanceDeltaMm(new THREE.Vector3(0, deltaY, 0));
    if (this.logic.state.currentValue != null && this.logic.state.measurementType === "vertical") {
      this.logic.state.currentValue = Math.round(parsed);
    }
  };

  notifyDrag(movingBoxId: string | null = null): void {
    if (!this.enabled) return;
    if (this.logic.state.mode === "OFF") this.draggingOff = true;
    const moving = this.deps.getMovableObjectById(movingBoxId);
    const others = this.deps.getMovableObjects();
    this.logic.updateAutoDistance(moving, others);
  }

  private loop = (): void => {
    const frames = [];
    const shouldRenderOff = this.logic.state.mode === "OFF" && this.draggingOff && this.logic.autoMeasurements.length > 0;
    if (shouldRenderOff) {
      frames.push(...this.logic.autoMeasurements);
    }
    const shouldRenderOn =
      this.logic.state.mode === "ON" &&
      this.logic.isManualMeasurementActive() &&
      this.logic.state.startPoint &&
      this.logic.state.endPoint &&
      this.logic.state.currentValue != null;
    if (shouldRenderOn) {
      frames.push({
        start: this.logic.state.startPoint,
        end: this.logic.state.endPoint,
        valueMm: this.logic.state.currentValue,
        color: "#3b82f6",
        type: this.logic.state.measurementType,
      });
    }
    this.lastRenderedMeasurements = frames.map((m) => ({
      start: m.start.clone(),
      end: m.end.clone(),
      valueMm: m.valueMm,
      color: m.color,
      type: (m.type ?? "horizontal") as "horizontal" | "vertical" | "diagonal",
      label: m.label,
    }));
    if (shouldRenderOff || shouldRenderOn) {
      this.overlay.render(frames);
    } else {
      this.overlay.clear();
    }
    this.raf = window.requestAnimationFrame(this.loop);
  };

  setMode(mode: RulerMode): void {
    this.logic.setMode(mode);
    if (mode === "OFF") {
      this.overlay.clear();
    }
  }

  clearMeasurements(): void {
    this.logic.clearMeasurements();
  }

  toggleLayer(): void {
    this.overlay.toggle();
  }

  dispose(): void {
    this.enabled = false;
    if (this.raf != null) window.cancelAnimationFrame(this.raf);
    this.deps.host.removeEventListener("pointerdown", this.onPointerDown, { capture: true });
    this.deps.host.removeEventListener("pointermove", this.onPointerMove, { capture: true });
    this.deps.host.removeEventListener("pointerup", this.onPointerUp, { capture: true });
    this.deps.host.removeEventListener("dblclick", this.onLabelDoubleClick, { capture: true });
    this.overlay.dispose();
  }
}

