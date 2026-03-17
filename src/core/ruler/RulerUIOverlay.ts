import * as THREE from "three";
import type { SnapVisual } from "./RulerGeometry";
import type { ManualMeasurementMetrics } from "./RulerLogic";

export type OverlayMeasurement = {
  start: THREE.Vector3;
  end: THREE.Vector3;
  valueMm: number;
  color: string;
  label?: string;
};

type OverlayDeps = {
  host: HTMLElement;
  project: (_world: THREE.Vector3) => { x: number; y: number } | null;
  getCamera: () => THREE.Camera | null;
};

export class RulerUIOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private panel: HTMLDivElement;
  private panelDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private visible = true;
  private deps: OverlayDeps;
  private labels: Array<{ x: number; y: number; text: string; id: string; width: number; height: number }> = [];

  constructor(deps: OverlayDeps) {
    this.deps = deps;
    this.canvas = document.createElement("canvas");
    this.canvas.style.position = "absolute";
    this.canvas.style.inset = "0";
    // Overlay não deve bloquear input do Viewer (drag/orbit/rotate).
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex = "12";
    this.canvas.style.background = "transparent";
    this.ctx = this.canvas.getContext("2d");
    this.resize();
    deps.host.appendChild(this.canvas);
    this.panel = document.createElement("div");
    this.panel.style.position = "absolute";
    this.panel.style.right = "16px";
    this.panel.style.bottom = "16px";
    this.panel.style.minWidth = "210px";
    this.panel.style.maxWidth = "260px";
    this.panel.style.padding = "10px 12px";
    this.panel.style.borderRadius = "10px";
    this.panel.style.background = "rgba(12, 18, 28, 0.78)";
    this.panel.style.border = "1px solid rgba(255,255,255,0.12)";
    this.panel.style.color = "#fff";
    this.panel.style.font = "12px system-ui, sans-serif";
    this.panel.style.zIndex = "13";
    this.panel.style.pointerEvents = "auto";
    this.panel.style.userSelect = "none";
    this.panel.style.cursor = "move";
    this.panel.style.display = "none";
    this.panel.style.whiteSpace = "pre-line";
    this.panel.style.boxShadow = "0 10px 26px rgba(0,0,0,0.35)";
    this.panel.textContent = "Regua CAD";
    this.panel.addEventListener("pointerdown", this.onPanelPointerDown);
    window.addEventListener("pointermove", this.onWindowPointerMove);
    window.addEventListener("pointerup", this.onWindowPointerUp);
    deps.host.appendChild(this.panel);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  resize(): void {
    const r = this.deps.host.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(r.width));
    this.canvas.height = Math.max(1, Math.floor(r.height));
  }

  show(): void {
    this.visible = true;
    this.canvas.style.display = "block";
  }

  hide(): void {
    this.visible = false;
    this.canvas.style.display = "none";
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  getLabelAt(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const hit = this.labels.find((l) => Math.abs(l.x - x) < l.width * 0.5 && Math.abs(l.y - y) < l.height * 0.5);
    return hit?.id ?? null;
  }

  render(measurements: OverlayMeasurement[], snapVisuals: SnapVisual[] = []): void {
    const camera = this.deps.getCamera();
    if (!this.visible || !this.ctx || !camera) return;
    this.resize();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.labels = [];
    snapVisuals.forEach((visual) => {
      const projected = visual.points
        .map((p) => this.deps.project(p))
        .filter((p): p is { x: number; y: number } => p != null);
      if (projected.length === 0) return;
      this.ctx!.strokeStyle = visual.color;
      this.ctx!.fillStyle = visual.color;
      if (visual.kind === "point") {
        const p = projected[0];
        this.ctx!.beginPath();
        this.ctx!.arc(p.x, p.y, 7, 0, Math.PI * 2);
        this.ctx!.globalAlpha = 0.35;
        this.ctx!.fill();
        this.ctx!.globalAlpha = 1;
        this.ctx!.beginPath();
        this.ctx!.arc(p.x, p.y, 4.2, 0, Math.PI * 2);
        this.ctx!.fill();
        return;
      }
      if (visual.kind === "edge" && projected.length >= 2) {
        this.ctx!.lineWidth = 1.5;
        this.ctx!.globalAlpha = 0.9;
        this.ctx!.beginPath();
        this.ctx!.moveTo(projected[0].x, projected[0].y);
        this.ctx!.lineTo(projected[1].x, projected[1].y);
        this.ctx!.stroke();
        this.ctx!.globalAlpha = 1;
        return;
      }
      if (visual.kind === "face" && projected.length >= 3) {
        this.ctx!.lineWidth = 1.2;
        this.ctx!.beginPath();
        this.ctx!.moveTo(projected[0].x, projected[0].y);
        for (let i = 1; i < projected.length; i += 1) {
          this.ctx!.lineTo(projected[i].x, projected[i].y);
        }
        this.ctx!.closePath();
        this.ctx!.globalAlpha = 0.1;
        this.ctx!.fill();
        this.ctx!.globalAlpha = 0.45;
        this.ctx!.stroke();
        this.ctx!.globalAlpha = 1;
      }
    });
    measurements.forEach((_m, _idx) => {
      const a = this.deps.project(_m.start);
      const b = this.deps.project(_m.end);
      if (!a || !b) return;
      this.ctx!.strokeStyle = _m.color;
      this.ctx!.lineWidth = 2;
      this.ctx!.beginPath();
      this.ctx!.moveTo(a.x, a.y);
      this.ctx!.lineTo(b.x, b.y);
      this.ctx!.stroke();
      this.ctx!.fillStyle = _m.color;
      this.ctx!.beginPath();
      this.ctx!.arc(a.x, a.y, 3, 0, Math.PI * 2);
      this.ctx!.arc(b.x, b.y, 3, 0, Math.PI * 2);
      this.ctx!.fill();
    });
  }

  setMeasurementPanelVisible(visible: boolean): void {
    this.panel.style.display = visible ? "block" : "none";
  }

  updateMeasurementPanel(metrics: ManualMeasurementMetrics | null): void {
    if (!metrics) {
      this.panel.textContent = [
        "Regua CAD",
        "Distancia total: --",
        "Dx: --",
        "Dy: --",
        "Dz: --",
        "Horizontal (XZ): --",
        "Vertical (Y): --",
      ].join("\n");
      return;
    }
    const lines = [
      "Regua CAD",
      `Distancia total: ${metrics.total} mm`,
      `Dx: ${metrics.dx} mm`,
      `Dy: ${metrics.dy} mm`,
      `Dz: ${metrics.dz} mm`,
      `Horizontal (XZ): ${metrics.horizontal} mm`,
      `Vertical (Y): ${metrics.vertical} mm`,
    ];
    if (metrics.lateral != null) {
      lines.push(`Lateral: ${metrics.lateral} mm`);
    }
    this.panel.textContent = lines.join("\n");
  }

  clear(): void {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.labels = [];
  }

  dispose(): void {
    this.canvas.remove();
    this.panel.removeEventListener("pointerdown", this.onPanelPointerDown);
    window.removeEventListener("pointermove", this.onWindowPointerMove);
    window.removeEventListener("pointerup", this.onWindowPointerUp);
    this.panel.remove();
    this.labels = [];
  }

  private onPanelPointerDown = (event: PointerEvent): void => {
    this.panelDragging = true;
    const rect = this.panel.getBoundingClientRect();
    this.dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    this.panel.style.left = `${rect.left - this.deps.host.getBoundingClientRect().left}px`;
    this.panel.style.top = `${rect.top - this.deps.host.getBoundingClientRect().top}px`;
    this.panel.style.right = "auto";
    this.panel.style.bottom = "auto";
  };

  private onWindowPointerMove = (event: PointerEvent): void => {
    if (!this.panelDragging) return;
    const hostRect = this.deps.host.getBoundingClientRect();
    const panelRect = this.panel.getBoundingClientRect();
    const nextLeft = THREE.MathUtils.clamp(
      event.clientX - hostRect.left - this.dragOffset.x,
      0,
      Math.max(0, hostRect.width - panelRect.width)
    );
    const nextTop = THREE.MathUtils.clamp(
      event.clientY - hostRect.top - this.dragOffset.y,
      0,
      Math.max(0, hostRect.height - panelRect.height)
    );
    this.panel.style.left = `${nextLeft}px`;
    this.panel.style.top = `${nextTop}px`;
  };

  private onWindowPointerUp = (): void => {
    this.panelDragging = false;
  };
}

