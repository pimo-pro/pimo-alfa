import * as THREE from "three";
import type { ViewerBoxEntry } from "../types";
import {
  pickMeasurementSnap,
  type MeasurementSnapDeps,
  type MeasurementSnapKind,
  type MeasurementSnapResult,
} from "./measurementSnapService";
import {
  createUnifiedMeasurementId,
  metersToMm01,
  type RulerMeasurementHit,
  type UnifiedMeasurement,
  type UnifiedMeasurementPoint,
} from "./unifiedMeasurementTypes";
import { shortestByDistanceM } from "./parametricDimensions";

type RulerMovementSource = "transform" | "external";

export type UnifiedMeasurementMeasurement = { valueMm: number };

export type UnifiedMeasurementEngineDeps = {
  getCamera: () => THREE.Camera;
  getCanvas: () => HTMLCanvasElement;
  getContainer: () => HTMLElement;
  getBoxes: () => Map<string, ViewerBoxEntry>;
  getRoomWalls: () => Array<{ mesh: THREE.Object3D }>;
  getSelectedBoxId: () => string | null;
  isTransformDragging: () => boolean;
  projectWorldToScreen: (_world: THREE.Vector3) => { x: number; y: number } | null;
  getProjectMeasurements?: () => UnifiedMeasurement[];
  onMeasurementSaved?: (_entry: UnifiedMeasurement) => void;
  getNearestBoxDistance: () => RulerMeasurementHit | null;
  getNearestWallDistance: () => RulerMeasurementHit | null;
  getFloorDistance: () => RulerMeasurementHit | null;
};

type DraftPoint = {
  world: THREE.Vector3;
  point: UnifiedMeasurementPoint;
};

/**
 * Motor unificado de medição do Viewer.
 * Substitui ViewerMeasurementOverlay (A+B), InternalRuler (C) e InternalRulerOverlay (D).
 * - Um único overlay 2D DPI-aware.
 * - Medição global por dois pontos (peça/face/furo/parede/ponto livre).
 * - Snapping consistente via measurementSnapService (thresholds em px).
 * - Régua de movimento auxiliar (caixa->caixa/parede/chão) durante o arraste.
 * - Precisão unificada 0,1 mm.
 */
export class UnifiedMeasurementEngine {
  private readonly deps: UnifiedMeasurementEngineDeps;

  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayCtx: CanvasRenderingContext2D | null = null;

  private enabled = false;
  private saved: UnifiedMeasurement[] = [];
  private pointA: DraftPoint | null = null;
  private hover: MeasurementSnapResult | null = null;
  private lastMeasurement: UnifiedMeasurementMeasurement | null = null;

  private listenersAttached = false;
  private pointerMoveRafId: number | null = null;
  private pendingPointerEvent: PointerEvent | null = null;

  private boundClick: ((_event: MouseEvent) => void) | null = null;
  private boundPointerMove: ((_event: PointerEvent) => void) | null = null;
  private boundEsc: ((_event: KeyboardEvent) => void) | null = null;

  // Régua de movimento auxiliar
  private movementHit: RulerMeasurementHit | null = null;
  private rulerLastMovementAtMs = 0;
  private readonly rulerIdleClearDelayMs = 180;
  private lastSelectedBoxPos: { boxId: string; x: number; y: number; z: number } | null = null;

  private static readonly SAVED_LINE_COLOR = "#0369a1";
  private static readonly PREVIEW_LINE_COLOR = "rgba(14, 165, 233, 0.95)";
  private static readonly GUIDE_COLOR = "rgba(148, 163, 184, 0.7)";
  private static readonly POINT_COLOR_A = "#f59e0b";
  private static readonly SNAP_HIGHLIGHT_COLOR = "#fde047";
  private static readonly MOVEMENT_COLOR = "#ef4444";
  private static readonly LINE_WIDTH = 2.75;

  constructor(deps: UnifiedMeasurementEngineDeps) {
    this.deps = deps;
    this.setupOverlay();
    this.boundClick = (event: MouseEvent) => this.handleClick(event);
    this.boundPointerMove = (event: PointerEvent) => this.handlePointerMove(event);
    this.boundEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") this.clearDraft();
    };
  }

  // --- Ciclo de vida / modo ---

  setEnabled(enabled: boolean): void {
    const next = Boolean(enabled);
    if (next === this.enabled) return;
    this.enabled = next;
    this.clearDraftState();
    if (this.enabled) {
      this.resyncFromProject();
      this.attachListeners();
    } else {
      this.detachListeners();
    }
    this.updateVisibility();
    this.draw();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Alias compatível: a medição é global, o boxId é ignorado. */
  enableForBox(_boxId: string): void {
    this.setEnabled(true);
  }

  disable(): void {
    this.setEnabled(false);
  }

  isActive(): boolean {
    return this.enabled;
  }

  getActiveBoxId(): string | null {
    return null;
  }

  getLastMeasurement(): UnifiedMeasurementMeasurement | null {
    return this.lastMeasurement ? { ...this.lastMeasurement } : null;
  }

  syncFromProject(entries: UnifiedMeasurement[]): void {
    this.saved = Array.isArray(entries) ? entries.map((e) => this.cloneMeasurement(e)) : [];
    this.updateVisibility();
    this.draw();
  }

  onSelectionChanged(_nextBoxId: string | null): void {
    // A medição é global; mudar de seleção não cancela nada.
  }

  resize(): void {
    if (!this.overlayCanvas) return;
    const container = this.deps.getContainer();
    const dpr = this.getDpr();
    const cssW = Math.max(1, container.clientWidth || 1);
    const cssH = Math.max(1, container.clientHeight || 1);
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);
    if (this.overlayCanvas.width !== w) this.overlayCanvas.width = w;
    if (this.overlayCanvas.height !== h) this.overlayCanvas.height = h;
    if (this.shouldShow()) this.draw();
  }

  refreshOverlay(): void {
    if (!this.shouldShow()) return;
    this.draw();
  }

  dispose(): void {
    this.disable();
    this.cancelPointerMoveRaf();
    if (this.overlayCanvas) {
      this.overlayCanvas.remove();
      this.overlayCanvas = null;
      this.overlayCtx = null;
    }
    this.boundClick = null;
    this.boundPointerMove = null;
    this.boundEsc = null;
  }

  // --- Régua de movimento auxiliar (sempre disponível durante o arraste) ---

  onRulerMovementTick(source: RulerMovementSource): void {
    this.rulerLastMovementAtMs = performance.now();
    if (source === "external" && this.deps.isTransformDragging()) return;
    this.updateRulerDuringDrag();
  }

  syncRulerWithExternalSelectionMovement(): void {
    if (this.deps.isTransformDragging()) return;
    const selectedBoxId = this.deps.getSelectedBoxId();
    if (!selectedBoxId) {
      this.lastSelectedBoxPos = null;
      return;
    }
    const entry = this.deps.getBoxes().get(selectedBoxId);
    if (!entry) {
      this.lastSelectedBoxPos = null;
      return;
    }
    const p = entry.mesh.position;
    const last = this.lastSelectedBoxPos;
    if (!last || last.boxId !== selectedBoxId) {
      this.lastSelectedBoxPos = { boxId: selectedBoxId, x: p.x, y: p.y, z: p.z };
      return;
    }
    const moved =
      Math.abs(last.x - p.x) > 1e-6 || Math.abs(last.y - p.y) > 1e-6 || Math.abs(last.z - p.z) > 1e-6;
    if (!moved) return;
    this.lastSelectedBoxPos = { boxId: selectedBoxId, x: p.x, y: p.y, z: p.z };
    this.onRulerMovementTick("external");
  }

  clearRulerOverlayIfMovementIdle(nowMs: number): void {
    if (!this.movementHit) return;
    if (this.deps.isTransformDragging()) return;
    if (nowMs - this.rulerLastMovementAtMs <= this.rulerIdleClearDelayMs) return;
    this.clearMovementRuler();
  }

  clearMovementRuler(): void {
    if (!this.movementHit) return;
    this.movementHit = null;
    this.updateVisibility();
    this.draw();
  }

  private updateRulerDuringDrag(): void {
    const selectedBoxId = this.deps.getSelectedBoxId();
    if (!selectedBoxId || !this.deps.getBoxes().has(selectedBoxId)) {
      this.clearMovementRuler();
      return;
    }
    const candidates: RulerMeasurementHit[] = [];
    const nb = this.deps.getNearestBoxDistance();
    const nw = this.deps.getNearestWallDistance();
    const fl = this.deps.getFloorDistance();
    if (nb) candidates.push(nb);
    if (nw) candidates.push(nw);
    if (fl) candidates.push(fl);
    const chosen = shortestByDistanceM(candidates);
    this.movementHit = chosen ?? null;
    this.updateVisibility();
    this.draw();
  }

  // --- Setup / visibilidade ---

  private getDpr(): number {
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    return Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  }

  private setupOverlay(): void {
    if (this.overlayCanvas) return;
    const container = this.deps.getContainer();
    if (window.getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "17";
    canvas.style.background = "transparent";
    canvas.style.display = "none";
    container.appendChild(canvas);
    this.overlayCanvas = canvas;
    this.overlayCtx = canvas.getContext("2d");
    this.resize();
  }

  private shouldShow(): boolean {
    if (this.enabled) return true;
    if (this.movementHit) return true;
    return this.saved.some((e) => e.visible);
  }

  private updateVisibility(): void {
    if (!this.overlayCanvas) return;
    const visible = this.shouldShow();
    this.overlayCanvas.style.display = visible ? "block" : "none";
    if (!visible) this.clearCanvas();
  }

  // --- Listeners ---

  private attachListeners(): void {
    if (this.listenersAttached) return;
    const canvas = this.deps.getCanvas();
    if (this.boundClick) canvas.addEventListener("click", this.boundClick, true);
    if (this.boundPointerMove) canvas.addEventListener("pointermove", this.boundPointerMove);
    if (this.boundEsc) window.addEventListener("keydown", this.boundEsc);
    this.listenersAttached = true;
  }

  private detachListeners(): void {
    if (!this.listenersAttached) return;
    const canvas = this.deps.getCanvas();
    if (this.boundClick) canvas.removeEventListener("click", this.boundClick, true);
    if (this.boundPointerMove) canvas.removeEventListener("pointermove", this.boundPointerMove);
    if (this.boundEsc) window.removeEventListener("keydown", this.boundEsc);
    this.listenersAttached = false;
    this.cancelPointerMoveRaf();
  }

  private cancelPointerMoveRaf(): void {
    if (this.pointerMoveRafId != null) {
      cancelAnimationFrame(this.pointerMoveRafId);
      this.pointerMoveRafId = null;
    }
    this.pendingPointerEvent = null;
  }

  private snapDeps(): MeasurementSnapDeps {
    return {
      getCamera: this.deps.getCamera,
      getCanvas: this.deps.getCanvas,
      getBoxes: this.deps.getBoxes,
      getRoomWalls: this.deps.getRoomWalls,
      projectWorldToScreen: this.deps.projectWorldToScreen,
    };
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.enabled) return;
    if (this.deps.isTransformDragging()) return;
    this.pendingPointerEvent = event;
    if (this.pointerMoveRafId != null) return;
    this.pointerMoveRafId = requestAnimationFrame(() => {
      this.pointerMoveRafId = null;
      const pending = this.pendingPointerEvent;
      this.pendingPointerEvent = null;
      if (!pending) return;
      const anchor = this.pointA
        ? { world: this.pointA.world, boxId: this.pointA.point.ref?.boxId, local: this.pointA.point.ref?.local }
        : null;
      const snap = pickMeasurementSnap(pending, this.snapDeps(), anchor);
      this.hover = snap;
      this.draw();
    });
  }

  private handleClick(event: MouseEvent): void {
    if (!this.enabled) return;
    if (event.button !== 0) return;
    if (this.deps.isTransformDragging()) return;

    const anchor = this.pointA
      ? { world: this.pointA.world, boxId: this.pointA.point.ref?.boxId, local: this.pointA.point.ref?.local }
      : null;
    const snap = pickMeasurementSnap(event, this.snapDeps(), anchor);
    if (!snap) return; // clique em vazio: não consome (permite deseleção normal)

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (!this.pointA) {
      this.pointA = { world: snap.world.clone(), point: this.snapToPoint(snap) };
      this.lastMeasurement = null;
      this.hover = null;
      this.draw();
      return;
    }

    const bWorld = snap.world.clone();
    const distanceM = this.pointA.world.distanceTo(bWorld);
    const valueMm = metersToMm01(distanceM);
    const entry: UnifiedMeasurement = {
      id: createUnifiedMeasurementId(),
      a: this.pointA.point,
      b: this.snapToPoint(snap),
      valueMm,
      visible: true,
    };
    this.saved = [...this.saved, entry];
    this.deps.onMeasurementSaved?.(entry);
    this.lastMeasurement = { valueMm };
    this.pointA = null;
    this.hover = null;
    this.updateVisibility();
    this.draw();
  }

  private snapToPoint(snap: MeasurementSnapResult): UnifiedMeasurementPoint {
    const ref =
      snap.ref.boxId && snap.ref.local
        ? { boxId: snap.ref.boxId, local: { ...snap.ref.local } }
        : undefined;
    return {
      world: { x: snap.world.x, y: snap.world.y, z: snap.world.z },
      kind: snap.kind,
      ref,
    };
  }

  private clearDraft(): void {
    if (!this.pointA && !this.hover) return;
    this.clearDraftState();
    this.draw();
  }

  private clearDraftState(): void {
    this.pointA = null;
    this.hover = null;
    this.lastMeasurement = null;
    this.cancelPointerMoveRaf();
  }

  private resyncFromProject(): void {
    const entries = this.deps.getProjectMeasurements?.() ?? [];
    this.saved = entries.map((e) => this.cloneMeasurement(e));
  }

  private cloneMeasurement(e: UnifiedMeasurement): UnifiedMeasurement {
    return {
      ...e,
      a: { ...e.a, world: { ...e.a.world }, ref: e.a.ref ? { ...e.a.ref, local: e.a.ref.local ? { ...e.a.ref.local } : undefined } : undefined },
      b: { ...e.b, world: { ...e.b.world }, ref: e.b.ref ? { ...e.b.ref, local: e.b.ref.local ? { ...e.b.ref.local } : undefined } : undefined },
    };
  }

  private getBoxMesh(boxId: string): THREE.Object3D | null {
    return this.deps.getBoxes().get(boxId)?.mesh ?? null;
  }

  private pointToWorld(point: UnifiedMeasurementPoint): THREE.Vector3 {
    if (point.ref?.boxId && point.ref.local) {
      const boxRoot = this.getBoxMesh(point.ref.boxId);
      if (boxRoot) {
        boxRoot.updateMatrixWorld(true);
        return boxRoot.localToWorld(new THREE.Vector3(point.ref.local.x, point.ref.local.y, point.ref.local.z));
      }
    }
    return new THREE.Vector3(point.world.x, point.world.y, point.world.z);
  }

  // --- Desenho (DPI-aware, com fallback de projeção) ---

  private clearCanvas(): void {
    if (!this.overlayCanvas || !this.overlayCtx) return;
    this.overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
  }

  private draw(): void {
    if (!this.shouldShow()) {
      this.clearCanvas();
      this.updateVisibility();
      return;
    }
    this.resize();
    if (!this.overlayCanvas || !this.overlayCtx) return;
    const ctx = this.overlayCtx;
    const dpr = this.getDpr();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cssW = this.overlayCanvas.width / dpr;
    const cssH = this.overlayCanvas.height / dpr;
    ctx.clearRect(0, 0, cssW, cssH);

    this.drawSavedMeasurements(ctx);
    this.drawMovementRuler(ctx);

    if (this.hover) {
      this.drawSnapHighlight(ctx, this.hover.world, this.hover.kind);
    }
    if (this.pointA) {
      this.drawPointMarker(ctx, this.pointA.world, UnifiedMeasurementEngine.POINT_COLOR_A);
      if (this.hover) {
        this.drawAxisGuides(ctx, this.pointA.world, this.hover.world);
        const previewMm = metersToMm01(this.pointA.world.distanceTo(this.hover.world));
        this.drawMeasurementLine(
          ctx,
          this.pointA.world,
          this.hover.world,
          previewMm,
          UnifiedMeasurementEngine.PREVIEW_LINE_COLOR,
          UnifiedMeasurementEngine.LINE_WIDTH
        );
      }
    }
  }

  private drawSavedMeasurements(ctx: CanvasRenderingContext2D): void {
    for (const entry of this.saved) {
      if (!entry.visible) continue;
      const a = this.pointToWorld(entry.a);
      const b = this.pointToWorld(entry.b);
      this.drawMeasurementLine(
        ctx,
        a,
        b,
        entry.valueMm,
        UnifiedMeasurementEngine.SAVED_LINE_COLOR,
        UnifiedMeasurementEngine.LINE_WIDTH
      );
    }
  }

  private drawMovementRuler(ctx: CanvasRenderingContext2D): void {
    const hit = this.movementHit;
    if (!hit) return;
    const seg = this.projectClippedSegment(hit.start, hit.end);
    if (!seg) return;
    const [a, b] = seg;
    ctx.strokeStyle = UnifiedMeasurementEngine.MOVEMENT_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = UnifiedMeasurementEngine.MOVEMENT_COLOR;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 3, 0, Math.PI * 2);
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
    this.drawLabel(ctx, (a.x + b.x) * 0.5, (a.y + b.y) * 0.5, `${metersToMm01(hit.distanceM).toFixed(1)} mm`);
  }

  private drawMeasurementLine(
    ctx: CanvasRenderingContext2D,
    start: THREE.Vector3,
    end: THREE.Vector3,
    labelMm: number,
    lineColor: string,
    lineWidth: number
  ): void {
    const seg = this.projectClippedSegment(start, end);
    if (!seg) return;
    const [a, b] = seg;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    this.drawLabel(ctx, (a.x + b.x) * 0.5, (a.y + b.y) * 0.5, `${labelMm.toFixed(1)} mm`);
  }

  private drawAxisGuides(ctx: CanvasRenderingContext2D, a: THREE.Vector3, b: THREE.Vector3): void {
    const cornerX = new THREE.Vector3(b.x, a.y, a.z);
    const cornerY = new THREE.Vector3(b.x, b.y, a.z);
    this.drawGuideLine(ctx, a, cornerX);
    this.drawGuideLine(ctx, cornerX, cornerY);
    this.drawGuideLine(ctx, cornerY, b);
  }

  private drawGuideLine(ctx: CanvasRenderingContext2D, start: THREE.Vector3, end: THREE.Vector3): void {
    const seg = this.projectClippedSegment(start, end);
    if (!seg) return;
    const [a, b] = seg;
    ctx.strokeStyle = UnifiedMeasurementEngine.GUIDE_COLOR;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawPointMarker(ctx: CanvasRenderingContext2D, world: THREE.Vector3, color: string, radius = 5): void {
    const screen = this.deps.projectWorldToScreen(world);
    if (!screen) return;
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawSnapHighlight(ctx: CanvasRenderingContext2D, world: THREE.Vector3, kind: MeasurementSnapKind): void {
    if (kind === "free" || kind === "face") return;
    const screen = this.deps.projectWorldToScreen(world);
    if (!screen) return;
    ctx.strokeStyle = UnifiedMeasurementEngine.SNAP_HIGHLIGHT_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(253, 224, 71, 0.35)";
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLabel(ctx: CanvasRenderingContext2D, midX: number, midY: number, label: string): void {
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const padX = 8;
    const padY = 5;
    const textWidth = ctx.measureText(label).width;
    const boxW = textWidth + padX * 2;
    const boxH = 20 + padY;
    const labelY = midY - 16;

    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.beginPath();
    ctx.roundRect(midX - boxW / 2, labelY - boxH / 2, boxW, boxH, 5);
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(label, midX, labelY);
  }

  /**
   * Projeta um segmento 3D->2D com fallback: se um extremo estiver atrás da câmara,
   * procura por bissecção o ponto-fronteira visível; se ambos invisíveis, devolve null.
   */
  private projectClippedSegment(
    a3d: THREE.Vector3,
    b3d: THREE.Vector3
  ): [{ x: number; y: number }, { x: number; y: number }] | null {
    const pa = this.deps.projectWorldToScreen(a3d);
    const pb = this.deps.projectWorldToScreen(b3d);
    if (pa && pb) return [pa, pb];
    if (!pa && !pb) return null;

    const visible3d = pa ? a3d : b3d;
    const hidden3d = pa ? b3d : a3d;
    const visibleScreen = pa ?? pb!;
    let lo = 0;
    let hi = 1;
    const boundary = visible3d.clone();
    for (let i = 0; i < 18; i += 1) {
      const mid = (lo + hi) / 2;
      const sample = visible3d.clone().lerp(hidden3d, mid);
      if (this.deps.projectWorldToScreen(sample)) {
        boundary.copy(sample);
        lo = mid;
      } else {
        hi = mid;
      }
    }
    const boundaryScreen = this.deps.projectWorldToScreen(boundary);
    if (!boundaryScreen) return null;
    return pa ? [visibleScreen, boundaryScreen] : [boundaryScreen, visibleScreen];
  }
}
