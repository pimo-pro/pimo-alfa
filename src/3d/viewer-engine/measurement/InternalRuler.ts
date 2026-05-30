import * as THREE from "three";
import { closestPointOnSegment3D } from "./parametricDimensions";
import { InternalRulerHistory } from "./InternalRulerHistory";
import {
  createInternalMeasurementId,
  type InternalMeasurementEntry,
  type InternalMeasurementPoint,
} from "./internalRulerTypes";

export type InternalRulerMeasurement = {
  valueMm: number;
};

type InternalRulerDeps = {
  getCamera: () => THREE.Camera;
  getCanvas: () => HTMLCanvasElement;
  getContainer: () => HTMLElement;
  getBoxMesh: (_boxId: string) => THREE.Object3D | null;
  isTransformDragging: () => boolean;
  projectWorldToScreen: (_worldPoint: THREE.Vector3) => { x: number; y: number } | null;
  getProjectMeasurements?: () => InternalMeasurementEntry[];
  onMeasurementSaved?: (_entry: InternalMeasurementEntry) => void;
};

type StoredPoint = {
  world: THREE.Vector3;
  local: THREE.Vector3;
};

type SnapKind = "vertex" | "edgeMid" | "edge" | "faceCenter" | "axis" | "boxCenter" | "face";

type SnapCandidate = {
  priority: number;
  kind: SnapKind;
  world: THREE.Vector3;
};

/**
 * Régua interna — mede distâncias entre dois pontos dentro de UMA caixa (espaço local).
 * Modo separado da régua externa e da medição entre arestas existente.
 */
export class InternalRuler {
  private readonly deps: InternalRulerDeps;
  private readonly history = new InternalRulerHistory();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly edgesCache = new Map<string, Array<{ a: THREE.Vector3; b: THREE.Vector3 }>>();
  private readonly _boxWorld = new THREE.Box3();
  private readonly _localPoint = new THREE.Vector3();
  private readonly _tempA = new THREE.Vector3();
  private readonly _tempB = new THREE.Vector3();
  private readonly _tempC = new THREE.Vector3();

  private activeBoxId: string | null = null;
  private pointA: StoredPoint | null = null;
  private pointB: StoredPoint | null = null;
  private lastMeasurement: InternalRulerMeasurement | null = null;
  private hoverPoint: StoredPoint | null = null;
  private snapHighlight: { world: THREE.Vector3; kind: SnapKind } | null = null;

  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayCtx: CanvasRenderingContext2D | null = null;
  private listenersAttached = false;
  private pointerMoveRafId: number | null = null;
  private pendingPointerEvent: PointerEvent | null = null;

  private boundClick: ((_event: MouseEvent) => void) | null = null;
  private boundPointerMove: ((_event: PointerEvent) => void) | null = null;

  private static readonly SNAP_VERTEX_WORLD_M = 0.028;
  private static readonly SNAP_EDGE_MID_WORLD_M = 0.026;
  private static readonly SNAP_EDGE_WORLD_M = 0.02;
  private static readonly SNAP_FACE_CENTER_WORLD_M = 0.03;
  private static readonly SNAP_AXIS_WORLD_M = 0.022;
  private static readonly SNAP_BOX_CENTER_WORLD_M = 0.035;

  private static readonly SAVED_LINE_COLOR = "#0369a1";
  private static readonly LINE_WIDTH = 2.75;
  private static readonly PREVIEW_LINE_COLOR = "rgba(14, 165, 233, 0.92)";
  private static readonly GUIDE_COLOR = "rgba(148, 163, 184, 0.7)";
  private static readonly POINT_COLOR_A = "#f59e0b";
  private static readonly SNAP_HIGHLIGHT_COLOR = "#fde047";

  constructor(deps: InternalRulerDeps) {
    this.deps = deps;
    this.setupOverlay();
    this.boundClick = (event: MouseEvent) => this.handleClick(event);
    this.boundPointerMove = (event: PointerEvent) => this.handlePointerMove(event);
  }

  enableForBox(boxId: string): void {
    const mesh = this.deps.getBoxMesh(boxId);
    if (!mesh) return;
    this.activeBoxId = boxId;
    this.clearDraft();
    this.resyncHistoryFromProject();
    this.attachListeners();
    this.updateOverlayVisibility();
    this.drawOverlay();
  }

  disable(): void {
    this.activeBoxId = null;
    this.clearDraft();
    this.history.clearAll();
    this.resyncHistoryFromProject();
    this.detachListeners();
    this.updateOverlayVisibility();
  }

  syncFromProject(entries: InternalMeasurementEntry[]): void {
    this.history.setEntries(entries);
    this.updateOverlayVisibility();
    this.drawOverlay();
  }

  getHistoryAll(): InternalMeasurementEntry[] {
    return this.history.getAll();
  }

  isActive(): boolean {
    return this.activeBoxId != null;
  }

  getActiveBoxId(): string | null {
    return this.activeBoxId;
  }

  getLastMeasurement(): InternalRulerMeasurement | null {
    return this.lastMeasurement ? { ...this.lastMeasurement } : null;
  }

  onSelectionChanged(nextBoxId: string | null): void {
    if (!this.isActive()) return;
    if (nextBoxId !== this.activeBoxId) {
      this.disable();
    }
  }

  resize(): void {
    if (!this.overlayCanvas) return;
    const container = this.deps.getContainer();
    const w = Math.max(1, container.clientWidth || 1);
    const h = Math.max(1, container.clientHeight || 1);
    if (this.overlayCanvas.width !== w) this.overlayCanvas.width = w;
    if (this.overlayCanvas.height !== h) this.overlayCanvas.height = h;
    if (this.shouldShowOverlay()) this.drawOverlay();
  }

  refreshOverlay(): void {
    if (!this.shouldShowOverlay()) return;
    this.drawOverlay();
  }

  dispose(): void {
    this.disable();
    this.cancelPointerMoveRaf();
    if (this.overlayCanvas) {
      this.overlayCanvas.remove();
      this.overlayCanvas = null;
      this.overlayCtx = null;
    }
    this.edgesCache.clear();
    this.boundClick = null;
    this.boundPointerMove = null;
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
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "17";
    canvas.style.background = "transparent";
    canvas.style.display = "none";
    container.appendChild(canvas);
    this.overlayCanvas = canvas;
    this.overlayCtx = canvas.getContext("2d");
    this.resize();
  }

  private resyncHistoryFromProject(): void {
    const entries = this.deps.getProjectMeasurements?.() ?? [];
    this.history.setEntries(entries);
  }

  private shouldShowOverlay(): boolean {
    if (this.isActive()) return true;
    return this.history.getVisible().some((e) => this.deps.getBoxMesh(e.boxId) != null);
  }

  private updateOverlayVisibility(): void {
    const visible = this.shouldShowOverlay();
    this.showOverlay(visible);
    if (!visible) this.clearOverlayCanvas();
  }

  private localPointToWorld(boxRoot: THREE.Object3D, local: InternalMeasurementPoint): THREE.Vector3 {
    return boxRoot.localToWorld(new THREE.Vector3(local.x, local.y, local.z));
  }

  private showOverlay(visible: boolean): void {
    if (this.overlayCanvas) {
      this.overlayCanvas.style.display = visible ? "block" : "none";
    }
  }

  private attachListeners(): void {
    if (this.listenersAttached) return;
    const canvas = this.deps.getCanvas();
    if (this.boundClick) canvas.addEventListener("click", this.boundClick, true);
    if (this.boundPointerMove) canvas.addEventListener("pointermove", this.boundPointerMove);
    this.listenersAttached = true;
  }

  private detachListeners(): void {
    if (!this.listenersAttached) return;
    const canvas = this.deps.getCanvas();
    if (this.boundClick) canvas.removeEventListener("click", this.boundClick, true);
    if (this.boundPointerMove) canvas.removeEventListener("pointermove", this.boundPointerMove);
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

  private handlePointerMove(event: PointerEvent): void {
    if (!this.isActive()) return;
    if (!this.pointA || this.pointB) return;
    if (this.deps.isTransformDragging()) return;

    this.pendingPointerEvent = event;
    if (this.pointerMoveRafId != null) return;
    this.pointerMoveRafId = requestAnimationFrame(() => {
      this.pointerMoveRafId = null;
      const pending = this.pendingPointerEvent;
      this.pendingPointerEvent = null;
      if (!pending) return;
      this.updateHoverPreview(pending);
    });
  }

  private updateHoverPreview(event: PointerEvent): void {
    const pick = this.pickPointInActiveBox(event);
    if (!pick) {
      if (this.hoverPoint || this.snapHighlight) {
        this.hoverPoint = null;
        this.snapHighlight = null;
        this.drawOverlay();
      }
      return;
    }
    this.hoverPoint = pick.point;
    this.snapHighlight = pick.snapHighlight;
    this.drawOverlay();
  }

  private handleClick(event: MouseEvent): void {
    if (!this.isActive()) return;
    if (event.button !== 0) return;
    if (this.deps.isTransformDragging()) return;

    const pick = this.pickPointInActiveBox(event);
    if (!pick) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const stored = pick.point;

    if (!this.pointA) {
      this.pointA = stored;
      this.pointB = null;
      this.lastMeasurement = null;
      this.clearPreviewState();
      this.drawOverlay();
      return;
    }

    this.pointB = stored;
    const distanceM = this.pointA.world.distanceTo(this.pointB.world);
    const valueMm = Math.round(distanceM * 10000) / 10;
    const entry: InternalMeasurementEntry = {
      id: createInternalMeasurementId(),
      boxId: this.activeBoxId!,
      a: {
        x: this.pointA.local.x,
        y: this.pointA.local.y,
        z: this.pointA.local.z,
      },
      b: {
        x: stored.local.x,
        y: stored.local.y,
        z: stored.local.z,
      },
      valueMm,
      visible: true,
    };
    this.history.addMeasurement(entry);
    this.deps.onMeasurementSaved?.(entry);
    this.lastMeasurement = { valueMm };
    this.pointA = null;
    this.pointB = null;
    this.clearPreviewState();
    this.updateOverlayVisibility();
    this.drawOverlay();
  }

  private pickPointInActiveBox(
    event: { clientX: number; clientY: number }
  ): { point: StoredPoint; snapHighlight: { world: THREE.Vector3; kind: SnapKind } | null } | null {
    const boxId = this.activeBoxId;
    if (!boxId) return null;
    const boxRoot = this.deps.getBoxMesh(boxId);
    if (!boxRoot) return null;

    const canvas = this.deps.getCanvas();
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.pointer.set(x, y);
    this.raycaster.setFromCamera(this.pointer, this.deps.getCamera());
    boxRoot.updateMatrixWorld(true);

    const hits = this.raycaster.intersectObject(boxRoot, true);
    if (!hits.length) return null;

    const hit = hits[0];
    const hitMesh = this.getMeshFromObject(hit.object);
    if (!hitMesh) return null;

    const facePoint = hit.point.clone();
    const snap = this.resolveSnap(boxRoot, hitMesh, hit, facePoint);
    const local = boxRoot.worldToLocal(snap.world.clone());
    return {
      point: { world: snap.world, local },
      snapHighlight: snap.kind !== "face" ? { world: snap.world.clone(), kind: snap.kind } : null,
    };
  }

  private resolveSnap(
    boxRoot: THREE.Object3D,
    hitMesh: THREE.Mesh,
    hit: THREE.Intersection,
    facePoint: THREE.Vector3
  ): SnapCandidate & { world: THREE.Vector3 } {
    const geometry = hitMesh.geometry;
    const candidates: SnapCandidate[] = [];

    if (geometry instanceof THREE.BufferGeometry) {
      hitMesh.updateMatrixWorld(true);
      this.collectVertexSnaps(hitMesh, geometry, facePoint, candidates);
      this.collectEdgeMidSnaps(hitMesh, geometry, facePoint, candidates);
      this.collectEdgeSnaps(hitMesh, geometry, facePoint, candidates);
    }

    this.collectFaceCenterSnap(hitMesh, hit, facePoint, candidates);
    this.collectAxisSnaps(boxRoot, facePoint, candidates);
    this.collectBoxCenterSnap(boxRoot, facePoint, candidates);

    candidates.push({ priority: 99, kind: "face", world: facePoint.clone() });

    candidates.sort((a, b) => {
      const distA = a.world.distanceTo(facePoint);
      const distB = b.world.distanceTo(facePoint);
      if (a.priority !== b.priority) return a.priority - b.priority;
      return distA - distB;
    });

    return candidates[0];
  }

  private collectVertexSnaps(
    mesh: THREE.Mesh,
    geometry: THREE.BufferGeometry,
    ref: THREE.Vector3,
    out: SnapCandidate[]
  ): void {
    const pos = geometry.getAttribute("position");
    if (!(pos instanceof THREE.BufferAttribute)) return;
    const threshold = InternalRuler.SNAP_VERTEX_WORLD_M;
    const local = this._localPoint;
    for (let i = 0; i < pos.count; i += 1) {
      local.fromBufferAttribute(pos, i);
      const world = mesh.localToWorld(local.clone());
      if (world.distanceTo(ref) <= threshold) {
        out.push({ priority: 1, kind: "vertex", world });
      }
    }
  }

  private collectEdgeMidSnaps(
    mesh: THREE.Mesh,
    geometry: THREE.BufferGeometry,
    ref: THREE.Vector3,
    out: SnapCandidate[]
  ): void {
    const segments = this.getEdgeSegments(geometry);
    const threshold = InternalRuler.SNAP_EDGE_MID_WORLD_M;
    const a = this._tempA;
    const b = this._tempB;
    const mid = this._tempC;
    for (const seg of segments) {
      a.copy(seg.a).applyMatrix4(mesh.matrixWorld);
      b.copy(seg.b).applyMatrix4(mesh.matrixWorld);
      mid.copy(a).add(b).multiplyScalar(0.5);
      if (mid.distanceTo(ref) <= threshold) {
        out.push({ priority: 2, kind: "edgeMid", world: mid.clone() });
      }
    }
  }

  private collectEdgeSnaps(
    mesh: THREE.Mesh,
    geometry: THREE.BufferGeometry,
    ref: THREE.Vector3,
    out: SnapCandidate[]
  ): void {
    const segments = this.getEdgeSegments(geometry);
    const threshold = InternalRuler.SNAP_EDGE_WORLD_M;
    const a = this._tempA;
    const b = this._tempB;
    for (const seg of segments) {
      a.copy(seg.a).applyMatrix4(mesh.matrixWorld);
      b.copy(seg.b).applyMatrix4(mesh.matrixWorld);
      const closest = closestPointOnSegment3D(
        { x: ref.x, y: ref.y, z: ref.z },
        { x: a.x, y: a.y, z: a.z },
        { x: b.x, y: b.y, z: b.z }
      );
      const candidate = new THREE.Vector3(closest.x, closest.y, closest.z);
      if (candidate.distanceTo(ref) <= threshold) {
        out.push({ priority: 3, kind: "edge", world: candidate });
      }
    }
  }

  private collectFaceCenterSnap(
    mesh: THREE.Mesh,
    hit: THREE.Intersection,
    ref: THREE.Vector3,
    out: SnapCandidate[]
  ): void {
    const face = hit.face;
    const geometry = mesh.geometry;
    if (!face || !(geometry instanceof THREE.BufferGeometry)) return;
    const pos = geometry.getAttribute("position");
    if (!(pos instanceof THREE.BufferAttribute)) return;

    mesh.updateMatrixWorld(true);
    const va = this._tempA.fromBufferAttribute(pos, face.a).applyMatrix4(mesh.matrixWorld);
    const vb = this._tempB.fromBufferAttribute(pos, face.b).applyMatrix4(mesh.matrixWorld);
    const vc = this._tempC.fromBufferAttribute(pos, face.c).applyMatrix4(mesh.matrixWorld);
    const center = new THREE.Vector3()
      .add(va)
      .add(vb)
      .add(vc)
      .multiplyScalar(1 / 3);

    if (center.distanceTo(ref) <= InternalRuler.SNAP_FACE_CENTER_WORLD_M) {
      out.push({ priority: 4, kind: "faceCenter", world: center });
    }
  }

  private collectAxisSnaps(boxRoot: THREE.Object3D, refWorld: THREE.Vector3, out: SnapCandidate[]): void {
    const localRef = boxRoot.worldToLocal(refWorld.clone());
    const anchorLocal = this.pointA?.local ?? boxRoot.worldToLocal(this.getBoxWorldCenter(boxRoot).clone());
    const threshold = InternalRuler.SNAP_AXIS_WORLD_M;

    const axisPoints = [
      new THREE.Vector3(localRef.x, anchorLocal.y, anchorLocal.z),
      new THREE.Vector3(localRef.x, localRef.y, anchorLocal.z),
      new THREE.Vector3(anchorLocal.x, anchorLocal.y, localRef.z),
    ];

    for (const local of axisPoints) {
      const world = boxRoot.localToWorld(local.clone());
      if (world.distanceTo(refWorld) <= threshold) {
        out.push({ priority: 5, kind: "axis", world });
      }
    }
  }

  private collectBoxCenterSnap(boxRoot: THREE.Object3D, ref: THREE.Vector3, out: SnapCandidate[]): void {
    const center = this.getBoxWorldCenter(boxRoot);
    if (center.distanceTo(ref) <= InternalRuler.SNAP_BOX_CENTER_WORLD_M) {
      out.push({ priority: 6, kind: "boxCenter", world: center.clone() });
    }
  }

  private getBoxWorldCenter(boxRoot: THREE.Object3D): THREE.Vector3 {
    boxRoot.updateMatrixWorld(true);
    this._boxWorld.setFromObject(boxRoot);
    return this._boxWorld.getCenter(new THREE.Vector3());
  }

  private getEdgeSegments(geometry: THREE.BufferGeometry): Array<{ a: THREE.Vector3; b: THREE.Vector3 }> {
    const key = geometry.uuid;
    const cached = this.edgesCache.get(key);
    if (cached) return cached;

    const edges = new THREE.EdgesGeometry(geometry, 1);
    const attr = edges.getAttribute("position");
    const out: Array<{ a: THREE.Vector3; b: THREE.Vector3 }> = [];
    if (attr instanceof THREE.BufferAttribute) {
      for (let i = 0; i < attr.count - 1; i += 2) {
        out.push({
          a: new THREE.Vector3().fromBufferAttribute(attr, i),
          b: new THREE.Vector3().fromBufferAttribute(attr, i + 1),
        });
      }
    }
    edges.dispose();
    this.edgesCache.set(key, out);
    return out;
  }

  private getMeshFromObject(object: THREE.Object3D): THREE.Mesh | null {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (current instanceof THREE.Mesh && current.geometry instanceof THREE.BufferGeometry) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  private clearPreviewState(): void {
    this.hoverPoint = null;
    this.snapHighlight = null;
    this.cancelPointerMoveRaf();
  }

  private clearDraft(): void {
    this.pointA = null;
    this.pointB = null;
    this.lastMeasurement = null;
    this.clearPreviewState();
  }

  private clearOverlayCanvas(): void {
    if (!this.overlayCanvas || !this.overlayCtx) return;
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
  }

  private metersToLabelMm(distanceM: number): number {
    return Math.round(distanceM * 10000) / 10;
  }

  private drawScreenLine(
    ctx: CanvasRenderingContext2D,
    start: THREE.Vector3,
    end: THREE.Vector3,
    color: string,
    width: number,
    dashed = false
  ): boolean {
    const a = this.deps.projectWorldToScreen(start);
    const b = this.deps.projectWorldToScreen(end);
    if (!a || !b) return false;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    return true;
  }

  private drawScreenLabel(ctx: CanvasRenderingContext2D, midX: number, midY: number, label: string): void {
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

  private drawSnapHighlight(ctx: CanvasRenderingContext2D, world: THREE.Vector3): void {
    const screen = this.deps.projectWorldToScreen(world);
    if (!screen) return;
    ctx.strokeStyle = InternalRuler.SNAP_HIGHLIGHT_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(253, 224, 71, 0.35)";
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawAxisGuides(ctx: CanvasRenderingContext2D, boxRoot: THREE.Object3D, a: StoredPoint, b: StoredPoint): void {
    const al = a.local;
    const bl = b.local;
    const cornerX = boxRoot.localToWorld(new THREE.Vector3(bl.x, al.y, al.z));
    const cornerY = boxRoot.localToWorld(new THREE.Vector3(bl.x, bl.y, al.z));
    const end = b.world;

    this.drawScreenLine(ctx, a.world, cornerX, InternalRuler.GUIDE_COLOR, 1.5, true);
    this.drawScreenLine(ctx, cornerX, cornerY, InternalRuler.GUIDE_COLOR, 1.5, true);
    this.drawScreenLine(ctx, cornerY, end, InternalRuler.GUIDE_COLOR, 1.5, true);
  }

  private drawPointMarker(ctx: CanvasRenderingContext2D, point: StoredPoint, color: string, radius = 5): void {
    const screen = this.deps.projectWorldToScreen(point.world);
    if (!screen) return;
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawMeasurementLine(
    ctx: CanvasRenderingContext2D,
    start: THREE.Vector3,
    end: THREE.Vector3,
    labelMm: number,
    lineColor: string,
    lineWidth: number
  ): void {
    const a = this.deps.projectWorldToScreen(start);
    const b = this.deps.projectWorldToScreen(end);
    if (!a || !b) return;

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    const mx = (a.x + b.x) * 0.5;
    const my = (a.y + b.y) * 0.5;
    this.drawScreenLabel(ctx, mx, my, `${labelMm.toFixed(1)} mm`);
  }

  private drawSavedMeasurements(ctx: CanvasRenderingContext2D): void {
    for (const entry of this.history.getVisible()) {
      const boxRoot = this.deps.getBoxMesh(entry.boxId);
      if (!boxRoot) continue;
      boxRoot.updateMatrixWorld(true);
      const aWorld = this.localPointToWorld(boxRoot, entry.a);
      const bWorld = this.localPointToWorld(boxRoot, entry.b);
      this.drawMeasurementLine(
        ctx,
        aWorld,
        bWorld,
        entry.valueMm,
        InternalRuler.SAVED_LINE_COLOR,
        InternalRuler.LINE_WIDTH
      );
    }
  }

  private drawOverlay(): void {
    if (!this.shouldShowOverlay()) {
      this.clearOverlayCanvas();
      return;
    }
    this.resize();
    if (!this.overlayCanvas || !this.overlayCtx) return;

    const ctx = this.overlayCtx;
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    this.drawSavedMeasurements(ctx);

    const boxRoot = this.activeBoxId ? this.deps.getBoxMesh(this.activeBoxId) : null;

    if (this.snapHighlight) {
      this.drawSnapHighlight(ctx, this.snapHighlight.world);
    }

    if (this.pointA) {
      this.drawPointMarker(ctx, this.pointA, InternalRuler.POINT_COLOR_A);
    }

    if (this.pointA && this.hoverPoint && !this.pointB && boxRoot) {
      this.drawAxisGuides(ctx, boxRoot, this.pointA, this.hoverPoint);
      const previewMm = this.metersToLabelMm(this.pointA.world.distanceTo(this.hoverPoint.world));
      this.drawMeasurementLine(
        ctx,
        this.pointA.world,
        this.hoverPoint.world,
        previewMm,
        InternalRuler.PREVIEW_LINE_COLOR,
        InternalRuler.LINE_WIDTH
      );
    }
  }
}
