import * as THREE from "three";
import { VIEWER_OVERLAY_Z_INDEX } from "../overlays/ViewerOverlayCoordinator";

export type SmartAlignOverlayMode =
  | "magnetic"
  | "explicit"
  | "continuity"
  | "flush"
  | "predictive"
  | "reference";

export type SmartAlignOverlayGuide = {
  start: THREE.Vector3;
  end: THREE.Vector3;
};

export type SmartAlignSnapOverlayState = {
  visible: boolean;
  mode: SmartAlignOverlayMode;
  guides: SmartAlignOverlayGuide[];
  arrowFrom?: THREE.Vector3;
  arrowTo?: THREE.Vector3;
  snapPoint?: THREE.Vector3;
  label?: string;
  faceHighlight?: { center: THREE.Vector3; color: string };
};

const COLORS: Record<SmartAlignOverlayMode, { stroke: string; fill: string; dash: string }> = {
  magnetic: { stroke: "#38bdf8", fill: "#38bdf8", dash: "#7dd3fc" },
  explicit: { stroke: "#f97316", fill: "#fb923c", dash: "#fdba74" },
  continuity: { stroke: "#a78bfa", fill: "#c4b5fd", dash: "#ddd6fe" },
  flush: { stroke: "#22c55e", fill: "#4ade80", dash: "#86efac" },
  predictive: { stroke: "#94a3b8", fill: "#cbd5e1", dash: "#e2e8f0" },
  reference: { stroke: "#94a3b8", fill: "#94a3b8", dash: "#cbd5e1" },
};

type Deps = {
  getContainer: () => HTMLElement;
  projectWorldToScreen: (_p: THREE.Vector3) => { x: number; y: number } | null;
};

export class SmartAlignSnapOverlay {
  private readonly deps: Deps;
  private state: SmartAlignSnapOverlayState = { visible: false, mode: "magnetic", guides: [] };
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(deps: Deps) {
    this.deps = deps;
    this.setup();
  }

  setState(state: Partial<SmartAlignSnapOverlayState>): void {
    this.state = { ...this.state, ...state };
    if (!this.state.visible) this.clear();
    else this.draw();
  }

  clear(): void {
    this.state = { visible: false, mode: "magnetic", guides: [] };
    if (!this.canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.style.display = "none";
  }

  refresh(): void {
    if (this.state.visible) this.draw();
  }

  resize(): void {
    if (!this.canvas) return;
    const container = this.deps.getContainer();
    const w = Math.max(1, container.clientWidth || 1);
    const h = Math.max(1, container.clientHeight || 1);
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    if (this.state.visible) this.draw();
  }

  dispose(): void {
    this.clear();
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
      this.ctx = null;
    }
  }

  private setup(): void {
    if (this.canvas) return;
    const container = this.deps.getContainer();
    if (window.getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = String(VIEWER_OVERLAY_Z_INDEX.smartSnapping - 1);
    canvas.style.background = "transparent";
    canvas.style.display = "none";
    container.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.resize();
  }

  private draw(): void {
    if (!this.canvas || !this.ctx) return;
    this.resize();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.style.display = "block";

    const colors = COLORS[this.state.mode];
    const isPredictive = this.state.mode === "predictive";
    const isReference = this.state.mode === "reference";

    for (const guide of this.state.guides) {
      const a = this.deps.projectWorldToScreen(guide.start);
      const b = this.deps.projectWorldToScreen(guide.end);
      if (!a || !b) continue;
      ctx.strokeStyle = isPredictive || isReference ? colors.dash : colors.stroke;
      ctx.lineWidth = isReference ? 1 : isPredictive ? 1.25 : 2;
      ctx.setLineDash(isPredictive ? [6, 5] : []);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      if (!isPredictive && !isReference) this.drawArrowHead(ctx, a, b, colors.stroke);
    }

    if (this.state.arrowFrom && this.state.arrowTo) {
      const from = this.deps.projectWorldToScreen(this.state.arrowFrom);
      const to = this.deps.projectWorldToScreen(this.state.arrowTo);
      if (from && to) {
        ctx.strokeStyle = `${colors.stroke}cc`;
        ctx.lineWidth = 1.75;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.setLineDash([]);
        this.drawArrowHead(ctx, from, to, colors.fill);
      }
    }

    if (this.state.faceHighlight) {
      const p = this.deps.projectWorldToScreen(this.state.faceHighlight.center);
      if (p) {
        ctx.strokeStyle = this.state.faceHighlight.color;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(p.x - 10, p.y - 10, 20, 20);
      }
    }

    if (this.state.snapPoint) {
      const p = this.deps.projectWorldToScreen(this.state.snapPoint);
      if (p) {
        ctx.fillStyle = colors.fill;
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = isReference ? 1 : 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isReference ? 4 : isPredictive ? 5 : 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    if (this.state.label && this.state.snapPoint && !isReference) {
      const p = this.deps.projectWorldToScreen(this.state.snapPoint);
      if (p) {
        ctx.font = "600 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const labelW = ctx.measureText(this.state.label).width + 12;
        const labelY = p.y - 12;
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.beginPath();
        ctx.roundRect(p.x - labelW / 2, labelY - 14, labelW, 16, 4);
        ctx.fill();
        ctx.fillStyle = "#f8fafc";
        ctx.fillText(this.state.label, p.x, labelY);
      }
    }
  }

  private drawArrowHead(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    color: string
  ): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 10) return;
    const ux = dx / len;
    const uy = dy / len;
    const size = 5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - ux * size - uy * size * 0.5, to.y - uy * size + ux * size * 0.5);
    ctx.lineTo(to.x - ux * size + uy * size * 0.5, to.y - uy * size - ux * size * 0.5);
    ctx.closePath();
    ctx.fill();
  }
}

export function buildOverlayStateFromCandidate(params: {
  mode: SmartAlignOverlayMode;
  meshPosition: THREE.Vector3;
  delta: THREE.Vector3;
  kind: string;
  targetCenter?: THREE.Vector3;
}): SmartAlignSnapOverlayState {
  const { mode, meshPosition, delta, kind, targetCenter } = params;
  const snapPoint = meshPosition.clone().add(delta);
  const guides: SmartAlignOverlayGuide[] = [];

  if (targetCenter) {
    guides.push({ start: meshPosition.clone(), end: targetCenter.clone() });
  }

  if (kind === "visual_continuity" || kind === "continue_line") {
    guides.push({ start: meshPosition.clone(), end: snapPoint.clone() });
  }

  const faceColor =
    kind === "DOOR_FRONT"
      ? "#f97316"
      : kind === "DRAWER_FRONT"
        ? "#eab308"
        : kind.startsWith("BOX_")
          ? "#38bdf8"
          : undefined;

  return {
    visible: true,
    mode,
    guides,
    arrowFrom: meshPosition.clone(),
    arrowTo: snapPoint.clone(),
    snapPoint,
    label: kind.replace(/_/g, " "),
    faceHighlight: targetCenter && faceColor ? { center: targetCenter, color: faceColor } : undefined,
  };
}
