import type { SnapDebugData } from "../3d/snapping/ModelWallSnap";

export class SnapDebugOverlay {
  private el: HTMLDivElement | null = null;

  constructor() {
    this.el = document.createElement("div");
    this.el.style.position = "fixed";
    this.el.style.top = "10px";
    this.el.style.left = "10px";
    this.el.style.padding = "8px";
    this.el.style.background = "rgba(0,0,0,0.6)";
    this.el.style.color = "#0f0";
    this.el.style.fontSize = "12px";
    this.el.style.zIndex = "99999";
    this.el.style.fontFamily = "Consolas, monospace";
    this.el.style.whiteSpace = "pre-line";
    document.body.appendChild(this.el);
  }

  update(data: SnapDebugData): void {
    if (!this.el) return;
    this.el.innerHTML = `
<b>SNAP DEBUG</b><br>
currentWallId: ${String(data.currentWallId)}<br>
nearestWallId: ${String(data.nearestWallId)}<br>
projection: ${data.projection.toFixed(3)}<br>
wallLength: ${data.wallLength.toFixed(3)}<br>
distanceToWall: ${data.distanceToWall.toFixed(3)}<br>
movementDir: ${data.movementDirection.x.toFixed(2)}, ${data.movementDirection.y.toFixed(2)}, ${data.movementDirection.z.toFixed(2)}<br>
alignment: ${data.alignment.toFixed(3)}<br>
insideWallRange: ${String(data.insideWallRange)}<br>
switchCondition: ${String(data.switchCondition)}<br>
`;
  }

  dispose(): void {
    if (!this.el) return;
    if (this.el.parentElement) {
      this.el.parentElement.removeChild(this.el);
    }
    this.el = null;
  }
}

