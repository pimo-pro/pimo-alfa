import * as THREE from "three";

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
  private visible = true;
  private deps: OverlayDeps;
  private labels: Array<{ x: number; y: number; text: string; id: string }> = [];

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
    const hit = this.labels.find((l) => Math.abs(l.x - x) < 60 && Math.abs(l.y - y) < 18);
    return hit?.id ?? null;
  }

  render(measurements: OverlayMeasurement[]): void {
    const camera = this.deps.getCamera();
    if (!this.visible || !this.ctx || !camera) return;
    this.resize();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.labels = [];
    measurements.forEach((m, idx) => {
      const a = this.deps.project(m.start);
      const b = this.deps.project(m.end);
      if (!a || !b) return;
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5 - 12;
      this.ctx!.strokeStyle = m.color;
      this.ctx!.lineWidth = 2;
      this.ctx!.beginPath();
      this.ctx!.moveTo(a.x, a.y);
      this.ctx!.lineTo(b.x, b.y);
      this.ctx!.stroke();
      this.ctx!.fillStyle = m.color;
      this.ctx!.beginPath();
      this.ctx!.arc(a.x, a.y, 3, 0, Math.PI * 2);
      this.ctx!.arc(b.x, b.y, 3, 0, Math.PI * 2);
      this.ctx!.fill();
      this.ctx!.fillStyle = "rgba(10,10,10,0.8)";
      this.ctx!.fillRect(mx - 46, my - 11, 92, 20);
      this.ctx!.fillStyle = "#ffffff";
      this.ctx!.font = "12px system-ui, sans-serif";
      this.ctx!.textAlign = "center";
      const text = m.label ?? `${Math.round(m.valueMm)}`;
      this.ctx!.fillText(text, mx, my + 4);
      this.labels.push({ x: mx, y: my, text, id: `label-${idx}` });
    });
  }

  clear(): void {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.labels = [];
  }

  dispose(): void {
    this.canvas.remove();
    this.labels = [];
  }
}

