import * as THREE from "three";
import type { InternalSelectionState } from "../selection/internalSelectionTypes";
import type { BoxCavityBoundsLocal, InternalCavityMeasurements } from "./internalRulerOverlayTypes";

type InternalRulerOverlayDeps = {
  getContainer: () => HTMLElement;
  projectWorldToScreen: (_world: THREE.Vector3) => { x: number; y: number } | null;
  getBoxMesh: (_boxId: string) => THREE.Object3D | null;
};

type AxisGuide = "x" | "y" | "z";

const LINE_COLOR = "#38bdf8";
const LINE_COLOR_SECONDARY = "rgba(125, 211, 252, 0.55)";
const GUIDE_DASH = [5, 4] as const;
const LINE_WIDTH_PRIMARY = 2.5;
const LINE_WIDTH_SECONDARY = 1.75;

/**
 * Overlay 2D — dimensões internas (L×A×P da cavidade) alinhadas à seleção interna.
 * Separado da régua externa e do InternalRuler legado (dois pontos).
 */
export class InternalRulerOverlay {
  private readonly deps: InternalRulerOverlayDeps;
  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayCtx: CanvasRenderingContext2D | null = null;
  private selection: InternalSelectionState | null = null;
  private measurements: InternalCavityMeasurements | null = null;
  private boundsLocal: BoxCavityBoundsLocal | null = null;

  private readonly _a = new THREE.Vector3();
  private readonly _b = new THREE.Vector3();

  constructor(deps: InternalRulerOverlayDeps) {
    this.deps = deps;
    this.setupOverlay();
  }

  sync(
    selection: InternalSelectionState | null,
    measurements: InternalCavityMeasurements | null,
    boundsLocal: BoxCavityBoundsLocal | null
  ): void {
    this.selection = selection;
    this.measurements = measurements;
    this.boundsLocal = boundsLocal;
    this.updateVisibility();
    this.draw();
  }

  refresh(): void {
    this.draw();
  }

  resize(): void {
    if (!this.overlayCanvas) return;
    const container = this.deps.getContainer();
    const w = Math.max(1, container.clientWidth || 1);
    const h = Math.max(1, container.clientHeight || 1);
    if (this.overlayCanvas.width !== w) this.overlayCanvas.width = w;
    if (this.overlayCanvas.height !== h) this.overlayCanvas.height = h;
    if (this.shouldShow()) this.draw();
  }

  dispose(): void {
    if (this.overlayCanvas) {
      this.overlayCanvas.remove();
      this.overlayCanvas = null;
      this.overlayCtx = null;
    }
    this.selection = null;
    this.measurements = null;
    this.boundsLocal = null;
  }

  isActive(): boolean {
    return this.shouldShow();
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
    canvas.style.zIndex = "18";
    canvas.style.background = "transparent";
    canvas.style.display = "none";
    container.appendChild(canvas);
    this.overlayCanvas = canvas;
    this.overlayCtx = canvas.getContext("2d");
    this.resize();
  }

  private shouldShow(): boolean {
    return Boolean(this.selection && this.measurements && this.boundsLocal);
  }

  private updateVisibility(): void {
    if (!this.overlayCanvas) return;
    this.overlayCanvas.style.display = this.shouldShow() ? "block" : "none";
  }

  private clearCanvas(): void {
    if (!this.overlayCanvas || !this.overlayCtx) return;
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
  }

  private draw(): void {
    if (!this.shouldShow() || !this.overlayCtx || !this.overlayCanvas) {
      this.clearCanvas();
      this.updateVisibility();
      return;
    }
    this.resize();
    const ctx = this.overlayCtx;
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    const selection = this.selection!;
    const measurements = this.measurements!;
    const bounds = this.boundsLocal!;
    const boxRoot = this.deps.getBoxMesh(selection.boxId);
    if (!boxRoot) return;

    boxRoot.updateMatrixWorld(true);
    const anchor = selection.localPoint;
    const primaryAxes = this.resolvePrimaryAxes(selection);

    this.drawAxisGuide(ctx, boxRoot, bounds, anchor, "x", measurements.widthMm, primaryAxes.has("x"));
    this.drawAxisGuide(ctx, boxRoot, bounds, anchor, "y", measurements.heightMm, primaryAxes.has("y"));
    this.drawAxisGuide(ctx, boxRoot, bounds, anchor, "z", measurements.depthMm, primaryAxes.has("z"));

    this.drawAnchorMarker(ctx, boxRoot, anchor);
  }

  private resolvePrimaryAxes(selection: InternalSelectionState): Set<AxisGuide> {
    const panelKey = selection.panelId?.split(":").pop() ?? "";
    if (panelKey === "left" || panelKey === "right" || panelKey === "lateral_esquerda" || panelKey === "lateral_direita") {
      return new Set(["y", "z"]);
    }
    if (panelKey === "top" || panelKey === "bottom" || panelKey === "cima" || panelKey === "fundo") {
      return new Set(["x", "z"]);
    }
    if (panelKey === "back" || panelKey === "costa") {
      return new Set(["x", "y"]);
    }
    return new Set(["x", "y", "z"]);
  }

  private localToWorld(boxRoot: THREE.Object3D, x: number, y: number, z: number, target: THREE.Vector3): THREE.Vector3 {
    return target.set(x, y, z).applyMatrix4(boxRoot.matrixWorld);
  }

  private drawAxisGuide(
    ctx: CanvasRenderingContext2D,
    boxRoot: THREE.Object3D,
    bounds: BoxCavityBoundsLocal,
    anchor: { x: number; y: number; z: number },
    axis: AxisGuide,
    labelMm: number,
    primary: boolean
  ): void {
    let ax = anchor.x;
    let ay = anchor.y;
    let az = anchor.z;
    let bx = anchor.x;
    let by = anchor.y;
    let bz = anchor.z;

    if (axis === "x") {
      ax = bounds.minX;
      bx = bounds.maxX;
    } else if (axis === "y") {
      ay = bounds.minY;
      by = bounds.maxY;
    } else {
      az = bounds.minZ;
      bz = bounds.maxZ;
    }

    const start = this.localToWorld(boxRoot, ax, ay, az, this._a);
    const end = this.localToWorld(boxRoot, bx, by, bz, this._b);
    const color = primary ? LINE_COLOR : LINE_COLOR_SECONDARY;
    const width = primary ? LINE_WIDTH_PRIMARY : LINE_WIDTH_SECONDARY;
    if (!this.drawScreenLine(ctx, start, end, color, width, !primary)) return;

    const screenA = this.deps.projectWorldToScreen(start);
    const screenB = this.deps.projectWorldToScreen(end);
    if (!screenA || !screenB) return;
    this.drawScreenLabel(ctx, (screenA.x + screenB.x) * 0.5, (screenA.y + screenB.y) * 0.5, `${labelMm.toFixed(1)} mm`);
  }

  private drawAnchorMarker(
    ctx: CanvasRenderingContext2D,
    boxRoot: THREE.Object3D,
    anchor: { x: number; y: number; z: number }
  ): void {
    const world = this.localToWorld(boxRoot, anchor.x, anchor.y, anchor.z, this._a);
    const screen = this.deps.projectWorldToScreen(world);
    if (!screen) return;
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawScreenLine(
    ctx: CanvasRenderingContext2D,
    start: THREE.Vector3,
    end: THREE.Vector3,
    color: string,
    width: number,
    dashed: boolean
  ): boolean {
    const a = this.deps.projectWorldToScreen(start);
    const b = this.deps.projectWorldToScreen(end);
    if (!a || !b) return false;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.setLineDash(dashed ? [...GUIDE_DASH] : []);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    return true;
  }

  private drawScreenLabel(ctx: CanvasRenderingContext2D, midX: number, midY: number, label: string): void {
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const padX = 7;
    const padY = 4;
    const textWidth = ctx.measureText(label).width;
    const boxW = textWidth + padX * 2;
    const boxH = 18 + padY;
    const labelY = midY - 14;

    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.beginPath();
    ctx.roundRect(midX - boxW / 2, labelY - boxH / 2, boxW, boxH, 4);
    ctx.fill();

    ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#e0f2fe";
    ctx.fillText(label, midX, labelY);
  }
}
