import * as THREE from "three";

export type RulerMeasurementHit = {
  kind: "box" | "wall" | "floor";
  distanceM: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
};

type RulerMovementSource = "transform" | "external";

type InternalEdgePick = {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
};

type InternalMeasurementState = {
  edgeA: InternalEdgePick | null;
  edgeB: InternalEdgePick | null;
  hover: InternalEdgePick | null;
  distanceM: number | null;
  distanceStart: THREE.Vector3 | null;
  distanceEnd: THREE.Vector3 | null;
};

type BoxLike = { mesh: THREE.Object3D };
type WallLike = { mesh: THREE.Mesh };

/**
 * Contrato de integração do overlay de medição.
 * Invariantes:
 * - Mundo em metros (m) para distâncias e pontos 3D.
 * - Overlay em pixels (px) no espaço de tela.
 * - getCanvas/getContainer devem referenciar o mesmo viewport ativo.
 * Ciclo de vida:
 * - constructor inicializa overlays/listeners internos.
 * - resize() deve ser chamado em mudanças de tamanho.
 * - dispose() deve ser chamado para remover listeners e canvases.
 */
type ViewerMeasurementOverlayDeps = {
  getCamera: () => THREE.Camera;
  getCanvas: () => HTMLCanvasElement;
  getContainer: () => HTMLElement;
  getRaycaster: () => THREE.Raycaster;
  getPointer: () => THREE.Vector2;
  getBoxes: () => Map<string, BoxLike>;
  getSelectedBoxId: () => string | null;
  getRoomWalls: () => WallLike[];
  isTransformDragging: () => boolean;
  projectWorldToScreen: (worldPoint: THREE.Vector3) => { x: number; y: number } | null;
  getNearestBoxDistance: () => RulerMeasurementHit | null;
  getNearestWallDistance: () => RulerMeasurementHit | null;
  getFloorDistance: () => RulerMeasurementHit | null;
};

/** Módulo responsável por régua de movimento e medição interna entre arestas. */
export class ViewerMeasurementOverlay {
  private readonly deps: ViewerMeasurementOverlayDeps;
  private rulerOverlayCanvas: HTMLCanvasElement | null = null;
  private rulerOverlayCtx: CanvasRenderingContext2D | null = null;
  private rulerOverlayMeasurement: RulerMeasurementHit | null = null;
  private lastSelectedBoxPositionForRuler: { boxId: string; x: number; y: number; z: number } | null = null;
  private rulerLastMovementAtMs = 0;
  private readonly rulerIdleClearDelayMs = 180;
  private internalMeasurementCanvas: HTMLCanvasElement | null = null;
  private internalMeasurementCtx: CanvasRenderingContext2D | null = null;
  private internalMeasurementState: InternalMeasurementState = {
    edgeA: null,
    edgeB: null,
    hover: null,
    distanceM: null,
    distanceStart: null,
    distanceEnd: null,
  };
  private internalMeasurementEdgesCache = new Map<string, Array<{ a: THREE.Vector3; b: THREE.Vector3 }>>();
  private internalMeasurementModeEnabled = false;
  private internalMeasurementListenersAttached = false;
  private boundInternalMeasurementPointerMove: ((event: PointerEvent) => void) | null = null;
  private boundInternalMeasurementClick: ((event: MouseEvent) => void) | null = null;
  private boundInternalMeasurementEsc: ((event: KeyboardEvent) => void) | null = null;

  private static readonly INTERNAL_EDGE_COLOR_A = "#f59e0b";
  private static readonly INTERNAL_EDGE_COLOR_B = "#22c55e";
  private static readonly INTERNAL_EDGE_COLOR_HOVER = "rgba(56,189,248,0.85)";
  private static readonly INTERNAL_EDGE_COLOR_MEASURE = "#ef4444";
  private static readonly INTERNAL_EDGE_WIDTH_HOVER = 2;
  private static readonly INTERNAL_EDGE_WIDTH_SELECTED = 3;
  private static readonly INTERNAL_EDGE_WIDTH_MEASURE = 2;
  private static readonly INTERNAL_EDGE_MIN_WORLD_M = 0.005;
  private static readonly INTERNAL_EDGE_MIN_SCREEN_PX = 6;

  constructor(deps: ViewerMeasurementOverlayDeps) {
    this.deps = deps;
    this.setupRulerOverlay();
    this.setupInternalMeasurementSystem();
  }

  setInternalMeasurementMode(enabled: boolean): void {
    this.internalMeasurementModeEnabled = Boolean(enabled);
    if (!this.internalMeasurementModeEnabled) {
      this.detachInternalMeasurementListeners();
      this.clearInternalMeasurementSelection();
      this.clearInternalMeasurementOverlayCanvas();
      if (this.internalMeasurementCanvas) this.internalMeasurementCanvas.style.display = "none";
    } else {
      this.attachInternalMeasurementListeners();
      if (this.internalMeasurementCanvas) this.internalMeasurementCanvas.style.display = "block";
      this.drawInternalMeasurementOverlay();
    }
  }

  getInternalMeasurementMode(): boolean {
    return this.internalMeasurementModeEnabled;
  }

  resize(): void {
    this.resizeRulerOverlay();
    this.resizeInternalMeasurementOverlay();
  }

  onSelectionChanged(id: string | null): void {
    if (id == null) {
      this.lastSelectedBoxPositionForRuler = null;
      this.clearRulerOverlay();
      return;
    }
    const entry = this.deps.getBoxes().get(id);
    if (entry) {
      const p = entry.mesh.position;
      this.lastSelectedBoxPositionForRuler = { boxId: id, x: p.x, y: p.y, z: p.z };
    } else {
      this.lastSelectedBoxPositionForRuler = null;
    }
  }

  onRulerMovementTick(source: RulerMovementSource): void {
    this.rulerLastMovementAtMs = performance.now();
    if (source === "external" && this.deps.isTransformDragging()) return;
    this.updateRulerDuringDrag();
  }

  syncRulerWithExternalSelectionMovement(): void {
    if (this.deps.isTransformDragging()) return;
    const selectedBoxId = this.deps.getSelectedBoxId();
    if (!selectedBoxId) {
      this.lastSelectedBoxPositionForRuler = null;
      return;
    }
    const entry = this.deps.getBoxes().get(selectedBoxId);
    if (!entry) {
      this.lastSelectedBoxPositionForRuler = null;
      return;
    }
    const p = entry.mesh.position;
    const last = this.lastSelectedBoxPositionForRuler;
    if (!last || last.boxId !== selectedBoxId) {
      this.lastSelectedBoxPositionForRuler = { boxId: selectedBoxId, x: p.x, y: p.y, z: p.z };
      return;
    }
    const moved =
      Math.abs(last.x - p.x) > 1e-6 ||
      Math.abs(last.y - p.y) > 1e-6 ||
      Math.abs(last.z - p.z) > 1e-6;
    if (!moved) return;
    this.lastSelectedBoxPositionForRuler = { boxId: selectedBoxId, x: p.x, y: p.y, z: p.z };
    this.onRulerMovementTick("external");
  }

  clearRulerOverlayIfMovementIdle(nowMs: number): void {
    if (!this.rulerOverlayMeasurement) return;
    if (this.deps.isTransformDragging()) return;
    if (nowMs - this.rulerLastMovementAtMs <= this.rulerIdleClearDelayMs) return;
    this.clearRulerOverlay();
  }

  clearRulerOverlay(): void {
    this.rulerOverlayMeasurement = null;
    if (!this.rulerOverlayCtx || !this.rulerOverlayCanvas) return;
    this.rulerOverlayCtx.clearRect(0, 0, this.rulerOverlayCanvas.width, this.rulerOverlayCanvas.height);
  }

  dispose(): void {
    const viewerCanvas = this.deps.getCanvas();
    if (this.boundInternalMeasurementPointerMove) {
      viewerCanvas.removeEventListener("pointermove", this.boundInternalMeasurementPointerMove);
      this.boundInternalMeasurementPointerMove = null;
    }
    if (this.boundInternalMeasurementClick) {
      viewerCanvas.removeEventListener("click", this.boundInternalMeasurementClick, true);
      this.boundInternalMeasurementClick = null;
    }
    if (this.boundInternalMeasurementEsc) {
      window.removeEventListener("keydown", this.boundInternalMeasurementEsc);
      this.boundInternalMeasurementEsc = null;
    }
    this.clearRulerOverlay();
    if (this.rulerOverlayCanvas) {
      this.rulerOverlayCanvas.remove();
      this.rulerOverlayCanvas = null;
      this.rulerOverlayCtx = null;
    }
    this.clearInternalMeasurementSelection();
    if (this.internalMeasurementCanvas) {
      this.internalMeasurementCanvas.remove();
      this.internalMeasurementCanvas = null;
      this.internalMeasurementCtx = null;
    }
    this.internalMeasurementEdgesCache.clear();
  }

  private setupRulerOverlay(): void {
    if (this.rulerOverlayCanvas) return;
    const container = this.deps.getContainer();
    if (window.getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "14";
    canvas.style.background = "transparent";
    container.appendChild(canvas);
    this.rulerOverlayCanvas = canvas;
    this.rulerOverlayCtx = canvas.getContext("2d");
    this.resizeRulerOverlay();
  }

  private resizeRulerOverlay(): void {
    if (!this.rulerOverlayCanvas) return;
    const container = this.deps.getContainer();
    const w = Math.max(1, container.clientWidth || 1);
    const h = Math.max(1, container.clientHeight || 1);
    if (this.rulerOverlayCanvas.width !== w) this.rulerOverlayCanvas.width = w;
    if (this.rulerOverlayCanvas.height !== h) this.rulerOverlayCanvas.height = h;
  }

  private updateRulerDuringDrag(): void {
    const selectedBoxId = this.deps.getSelectedBoxId();
    if (!selectedBoxId || !this.deps.getBoxes().has(selectedBoxId)) {
      this.clearRulerOverlay();
      return;
    }
    const candidates: RulerMeasurementHit[] = [];
    const nearestBox = this.deps.getNearestBoxDistance();
    const nearestWall = this.deps.getNearestWallDistance();
    const floor = this.deps.getFloorDistance();
    if (nearestBox) candidates.push(nearestBox);
    if (nearestWall) candidates.push(nearestWall);
    if (floor) candidates.push(floor);
    if (!candidates.length) {
      this.clearRulerOverlay();
      return;
    }
    candidates.sort((a, b) => a.distanceM - b.distanceM);
    this.rulerOverlayMeasurement = candidates[0];
    this.drawRulerOverlay(this.rulerOverlayMeasurement);
  }

  private drawRulerOverlay(hit: RulerMeasurementHit | null): void {
    this.resizeRulerOverlay();
    if (!this.rulerOverlayCtx || !this.rulerOverlayCanvas) return;
    const ctx = this.rulerOverlayCtx;
    ctx.clearRect(0, 0, this.rulerOverlayCanvas.width, this.rulerOverlayCanvas.height);
    if (!hit) return;
    const a = this.deps.projectWorldToScreen(hit.start);
    const b = this.deps.projectWorldToScreen(hit.end);
    if (!a || !b) return;
    const distanceMm = Math.round(hit.distanceM * 1000);
    const mx = (a.x + b.x) * 0.5;
    const my = (a.y + b.y) * 0.5;
    const label = `${distanceMm} mm`;

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(a.x, a.y, 3, 0, Math.PI * 2);
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "600 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const padX = 6;
    const padY = 4;
    const textWidth = ctx.measureText(label).width;
    const boxW = textWidth + padX * 2;
    const boxH = 18 + padY;
    const labelY = my - 14;
    ctx.fillStyle = "rgba(17, 24, 39, 0.9)";
    ctx.fillRect(mx - boxW / 2, labelY - boxH / 2, boxW, boxH);
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(mx - boxW / 2, labelY - boxH / 2, boxW, boxH);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, mx, labelY);
  }

  private setupInternalMeasurementSystem(): void {
    this.setupInternalMeasurementOverlay();
    this.boundInternalMeasurementPointerMove = (event: PointerEvent) => {
      this.handleInternalMeasurementPointerMove(event);
    };
    this.boundInternalMeasurementClick = (event: MouseEvent) => {
      this.handleInternalMeasurementClick(event);
    };
    this.boundInternalMeasurementEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") this.clearInternalMeasurementSelection();
    };
    this.setInternalMeasurementMode(false);
  }

  private attachInternalMeasurementListeners(): void {
    if (this.internalMeasurementListenersAttached) return;
    const canvas = this.deps.getCanvas();
    if (this.boundInternalMeasurementPointerMove) {
      canvas.addEventListener("pointermove", this.boundInternalMeasurementPointerMove);
    }
    if (this.boundInternalMeasurementClick) {
      canvas.addEventListener("click", this.boundInternalMeasurementClick, true);
    }
    if (this.boundInternalMeasurementEsc) {
      window.addEventListener("keydown", this.boundInternalMeasurementEsc);
    }
    this.internalMeasurementListenersAttached = true;
  }

  private detachInternalMeasurementListeners(): void {
    if (!this.internalMeasurementListenersAttached) return;
    const canvas = this.deps.getCanvas();
    if (this.boundInternalMeasurementPointerMove) {
      canvas.removeEventListener("pointermove", this.boundInternalMeasurementPointerMove);
    }
    if (this.boundInternalMeasurementClick) {
      canvas.removeEventListener("click", this.boundInternalMeasurementClick, true);
    }
    if (this.boundInternalMeasurementEsc) {
      window.removeEventListener("keydown", this.boundInternalMeasurementEsc);
    }
    this.internalMeasurementListenersAttached = false;
  }

  private setupInternalMeasurementOverlay(): void {
    if (this.internalMeasurementCanvas) return;
    const container = this.deps.getContainer();
    if (window.getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "16";
    canvas.style.background = "transparent";
    container.appendChild(canvas);
    this.internalMeasurementCanvas = canvas;
    this.internalMeasurementCtx = canvas.getContext("2d");
    this.resizeInternalMeasurementOverlay();
  }

  private resizeInternalMeasurementOverlay(): void {
    if (!this.internalMeasurementCanvas) return;
    const container = this.deps.getContainer();
    const w = Math.max(1, container.clientWidth || 1);
    const h = Math.max(1, container.clientHeight || 1);
    if (this.internalMeasurementCanvas.width !== w) this.internalMeasurementCanvas.width = w;
    if (this.internalMeasurementCanvas.height !== h) this.internalMeasurementCanvas.height = h;
  }

  private handleInternalMeasurementPointerMove(event: PointerEvent): void {
    if (!this.internalMeasurementModeEnabled) return;
    if (this.deps.isTransformDragging()) return;
    const nextHover = this.pickInternalMeasurementEdge(event);
    if ((this.internalMeasurementState.hover?.id ?? null) !== (nextHover?.id ?? null)) {
      this.internalMeasurementState.hover = nextHover;
      this.drawInternalMeasurementOverlay();
    }
  }

  private handleInternalMeasurementClick(event: MouseEvent): void {
    if (!this.internalMeasurementModeEnabled) return;
    if (event.button !== 0) return;
    if (this.deps.isTransformDragging()) return;
    const pick = this.pickInternalMeasurementEdge(event);
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (!pick) {
      this.clearInternalMeasurementSelection();
      return;
    }
    const state = this.internalMeasurementState;
    if (state.edgeA && state.edgeB) {
      state.edgeA = pick;
      state.edgeB = null;
      state.distanceM = null;
      state.distanceStart = null;
      state.distanceEnd = null;
      this.drawInternalMeasurementOverlay();
      return;
    }
    if (!state.edgeA) {
      state.edgeA = pick;
      state.edgeB = null;
      state.distanceM = null;
      state.distanceStart = null;
      state.distanceEnd = null;
      this.drawInternalMeasurementOverlay();
      return;
    }
    if (state.edgeA.id === pick.id) return;
    state.edgeB = pick;
    const distance = this.computeClosestPointsBetweenSegments(
      state.edgeA.start,
      state.edgeA.end,
      state.edgeB.start,
      state.edgeB.end
    );
    state.distanceM = distance.distance;
    state.distanceStart = distance.pointA;
    state.distanceEnd = distance.pointB;
    this.drawInternalMeasurementOverlay();
  }

  private clearInternalMeasurementSelection(): void {
    this.internalMeasurementState.edgeA = null;
    this.internalMeasurementState.edgeB = null;
    this.internalMeasurementState.hover = null;
    this.internalMeasurementState.distanceM = null;
    this.internalMeasurementState.distanceStart = null;
    this.internalMeasurementState.distanceEnd = null;
    this.drawInternalMeasurementOverlay();
  }

  private clearInternalMeasurementOverlayCanvas(): void {
    if (!this.internalMeasurementCanvas || !this.internalMeasurementCtx) return;
    this.internalMeasurementCtx.clearRect(
      0,
      0,
      this.internalMeasurementCanvas.width,
      this.internalMeasurementCanvas.height
    );
  }

  private pickInternalMeasurementEdge(event: { clientX: number; clientY: number }): InternalEdgePick | null {
    const roots: THREE.Object3D[] = [];
    this.deps.getBoxes().forEach((entry) => roots.push(entry.mesh));
    this.deps.getRoomWalls().forEach((w) => roots.push(w.mesh));
    if (!roots.length) return null;

    const canvas = this.deps.getCanvas();
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const pointer = this.deps.getPointer();
    const raycaster = this.deps.getRaycaster();
    pointer.set(x, y);
    raycaster.setFromCamera(pointer, this.deps.getCamera());
    const meshHits = raycaster.intersectObjects(roots, true);
    if (!meshHits.length) return null;
    const mesh = this.getInternalMeasurementMeshFromHit(meshHits[0].object);
    if (!mesh || !(mesh.geometry instanceof THREE.BufferGeometry)) return null;
    const segments = this.getInternalMeasurementSegments(mesh.geometry);
    if (!segments.length) return null;

    const cursor = new THREE.Vector2(event.clientX - rect.left, event.clientY - rect.top);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    let bestPick: InternalEdgePick | null = null;
    let bestDistancePxSq = Infinity;
    for (let i = 0; i < segments.length; i += 1) {
      a.copy(segments[i].a).applyMatrix4(mesh.matrixWorld);
      b.copy(segments[i].b).applyMatrix4(mesh.matrixWorld);
      const worldLen = a.distanceTo(b);
      if (worldLen < ViewerMeasurementOverlay.INTERNAL_EDGE_MIN_WORLD_M) continue;
      const screenA = this.deps.projectWorldToScreen(a);
      const screenB = this.deps.projectWorldToScreen(b);
      if (!screenA || !screenB) continue;
      const segScreenLen = Math.hypot(screenA.x - screenB.x, screenA.y - screenB.y);
      if (segScreenLen < ViewerMeasurementOverlay.INTERNAL_EDGE_MIN_SCREEN_PX) continue;
      const distancePxSq = this.distancePointToSegment2DSq(cursor, screenA, screenB);
      if (distancePxSq >= bestDistancePxSq) continue;
      bestDistancePxSq = distancePxSq;
      bestPick = {
        id: `${mesh.uuid}:${i}`,
        start: a.clone(),
        end: b.clone(),
      };
    }
    return bestPick;
  }

  private getInternalMeasurementMeshFromHit(object: THREE.Object3D): THREE.Mesh | null {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (current instanceof THREE.Mesh && current.geometry instanceof THREE.BufferGeometry) return current;
      current = current.parent;
    }
    return null;
  }

  private getInternalMeasurementSegments(geometry: THREE.BufferGeometry): Array<{ a: THREE.Vector3; b: THREE.Vector3 }> {
    const key = geometry.uuid;
    const cached = this.internalMeasurementEdgesCache.get(key);
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
    this.internalMeasurementEdgesCache.set(key, out);
    return out;
  }

  private distancePointToSegment2DSq(
    point: THREE.Vector2,
    a: { x: number; y: number },
    b: { x: number; y: number }
  ): number {
    const abX = b.x - a.x;
    const abY = b.y - a.y;
    const apX = point.x - a.x;
    const apY = point.y - a.y;
    const abLenSq = abX * abX + abY * abY;
    if (abLenSq <= 1e-8) return apX * apX + apY * apY;
    const t = THREE.MathUtils.clamp((apX * abX + apY * abY) / abLenSq, 0, 1);
    const cx = a.x + abX * t;
    const cy = a.y + abY * t;
    const dx = point.x - cx;
    const dy = point.y - cy;
    return dx * dx + dy * dy;
  }

  private computeClosestPointsBetweenSegments(
    p1: THREE.Vector3,
    q1: THREE.Vector3,
    p2: THREE.Vector3,
    q2: THREE.Vector3
  ): { pointA: THREE.Vector3; pointB: THREE.Vector3; distance: number } {
    const d1 = q1.clone().sub(p1);
    const d2 = q2.clone().sub(p2);
    const r = p1.clone().sub(p2);
    const a = d1.dot(d1);
    const e = d2.dot(d2);
    const f = d2.dot(r);

    let s = 0;
    let t = 0;
    const eps = 1e-10;
    if (a <= eps && e <= eps) {
      return { pointA: p1.clone(), pointB: p2.clone(), distance: p1.distanceTo(p2) };
    }
    if (a <= eps) {
      s = 0;
      t = THREE.MathUtils.clamp(f / e, 0, 1);
    } else {
      const c = d1.dot(r);
      if (e <= eps) {
        t = 0;
        s = THREE.MathUtils.clamp(-c / a, 0, 1);
      } else {
        const b = d1.dot(d2);
        const denom = a * e - b * b;
        if (Math.abs(denom) > eps) {
          s = THREE.MathUtils.clamp((b * f - c * e) / denom, 0, 1);
        } else {
          s = 0;
        }
        t = (b * s + f) / e;
        if (t < 0) {
          t = 0;
          s = THREE.MathUtils.clamp(-c / a, 0, 1);
        } else if (t > 1) {
          t = 1;
          s = THREE.MathUtils.clamp((b - c) / a, 0, 1);
        }
      }
    }

    const pointA = p1.clone().add(d1.clone().multiplyScalar(s));
    const pointB = p2.clone().add(d2.clone().multiplyScalar(t));
    const cands: Array<{ pointA: THREE.Vector3; pointB: THREE.Vector3 }> = [
      { pointA, pointB },
      { pointA: p1.clone(), pointB: this.closestPointOnSegment(p1, p2, q2) },
      { pointA: q1.clone(), pointB: this.closestPointOnSegment(q1, p2, q2) },
      { pointA: this.closestPointOnSegment(p2, p1, q1), pointB: p2.clone() },
      { pointA: this.closestPointOnSegment(q2, p1, q1), pointB: q2.clone() },
    ];

    let best = cands[0];
    let bestDist = best.pointA.distanceTo(best.pointB);
    for (let i = 1; i < cands.length; i += 1) {
      const d = cands[i].pointA.distanceTo(cands[i].pointB);
      if (d < bestDist) {
        best = cands[i];
        bestDist = d;
      }
    }
    return {
      pointA: best.pointA,
      pointB: best.pointB,
      distance: bestDist,
    };
  }

  private closestPointOnSegment(
    point: THREE.Vector3,
    segStart: THREE.Vector3,
    segEnd: THREE.Vector3
  ): THREE.Vector3 {
    const seg = segEnd.clone().sub(segStart);
    const lenSq = seg.lengthSq();
    if (lenSq <= 1e-10) return segStart.clone();
    const t = THREE.MathUtils.clamp(point.clone().sub(segStart).dot(seg) / lenSq, 0, 1);
    return segStart.clone().add(seg.multiplyScalar(t));
  }

  private drawInternalMeasurementOverlay(): void {
    if (!this.internalMeasurementModeEnabled) {
      this.clearInternalMeasurementOverlayCanvas();
      return;
    }
    this.resizeInternalMeasurementOverlay();
    if (!this.internalMeasurementCanvas || !this.internalMeasurementCtx) return;
    const ctx = this.internalMeasurementCtx;
    ctx.clearRect(0, 0, this.internalMeasurementCanvas.width, this.internalMeasurementCanvas.height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const drawEdge = (edge: InternalEdgePick | null, color: string, width = 2) => {
      if (!edge) return;
      const a = this.deps.projectWorldToScreen(edge.start);
      const b = this.deps.projectWorldToScreen(edge.end);
      if (!a || !b) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    };

    const state = this.internalMeasurementState;
    if (!state.edgeA && !state.edgeB) {
      drawEdge(state.hover, ViewerMeasurementOverlay.INTERNAL_EDGE_COLOR_HOVER, ViewerMeasurementOverlay.INTERNAL_EDGE_WIDTH_HOVER);
      return;
    }
    if (state.hover && state.hover.id !== state.edgeA?.id && state.hover.id !== state.edgeB?.id) {
      drawEdge(state.hover, ViewerMeasurementOverlay.INTERNAL_EDGE_COLOR_HOVER, ViewerMeasurementOverlay.INTERNAL_EDGE_WIDTH_HOVER);
    }
    drawEdge(state.edgeA, ViewerMeasurementOverlay.INTERNAL_EDGE_COLOR_A, ViewerMeasurementOverlay.INTERNAL_EDGE_WIDTH_SELECTED);
    drawEdge(state.edgeB, ViewerMeasurementOverlay.INTERNAL_EDGE_COLOR_B, ViewerMeasurementOverlay.INTERNAL_EDGE_WIDTH_SELECTED);

    if (
      state.edgeA &&
      state.edgeB &&
      state.distanceM != null &&
      state.distanceStart &&
      state.distanceEnd
    ) {
      const a = this.deps.projectWorldToScreen(state.distanceStart);
      const b = this.deps.projectWorldToScreen(state.distanceEnd);
      if (!a || !b) return;
      const distanceMm = Math.round(state.distanceM * 1000);
      const label = `${distanceMm}`;
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;
      ctx.strokeStyle = ViewerMeasurementOverlay.INTERNAL_EDGE_COLOR_MEASURE;
      ctx.lineWidth = ViewerMeasurementOverlay.INTERNAL_EDGE_WIDTH_MEASURE;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = ViewerMeasurementOverlay.INTERNAL_EDGE_COLOR_MEASURE;
      ctx.fillText(label, mx, my - 10);
    }
  }
}
