import * as THREE from "three";
import type { RemateBoxMeta } from "../../../core/remate/remateDimensions";
import type { ViewerBoxEntry } from "../types";
import { mmToM } from "../../../utils/units";
import { setBox3FromObjectExcludingLayoutProxy } from "../box/boxAabbUtils";
import {
  collectRemateSnapTargets,
  signedDistanceRemateFaceToPlane,
  type RemateSnapPlane,
} from "./remateSnapTargets";

type Deps = {
  getContainer: () => HTMLElement;
  projectWorldToScreen: (_p: THREE.Vector3) => { x: number; y: number } | null;
};

export type RemateSmartSnapBoxConfig = {
  widthM: number;
  heightM: number;
  depthM: number;
  box?: RemateBoxMeta;
};

export class RemateSmartSnapping {
  private enabled = true;
  private captureRadiusMm = 12;
  private magnetStrength = 0.85;
  private gridSizeMm = 10;
  private dragging = false;

  private activeSnapPoint: THREE.Vector3 | null = null;
  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayCtx: CanvasRenderingContext2D | null = null;

  private readonly _worldBox = new THREE.Box3();
  private readonly _localBox = new THREE.Box3();
  private readonly _localPos = new THREE.Vector3();
  private readonly _invBox = new THREE.Matrix4();
  private readonly _boxMatrix = new THREE.Matrix4();
  private readonly _corner = new THREE.Vector3();
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
    this.setupOverlay();
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
    this.clearOverlay();
  }

  setCaptureRadius(mm: number): void {
    this.captureRadiusMm = Math.max(1, mm);
  }

  setMagnetStrength(v: number): void {
    this.magnetStrength = THREE.MathUtils.clamp(v, 0, 1);
  }

  onDragStart(_mesh: THREE.Object3D): void {
    this.dragging = true;
    this.activeSnapPoint = null;
  }

  onDragEnd(): void {
    this.dragging = false;
    this.activeSnapPoint = null;
    this.clearOverlay();
  }

  applyDuringTranslate(params: {
    mesh: THREE.Mesh;
    boxEntry: ViewerBoxEntry;
    boxConfig: RemateSmartSnapBoxConfig;
    captureRadiusMm?: number;
    magnetStrength?: number;
  }): void {
    if (!this.enabled || !this.dragging) return;

    const { mesh, boxEntry, boxConfig } = params;
    const captureM = mmToM(params.captureRadiusMm ?? this.captureRadiusMm);
    const magnet = params.magnetStrength ?? this.magnetStrength;

    boxEntry.mesh.updateMatrixWorld(true);
    this._boxMatrix.copy(boxEntry.mesh.matrixWorld);
    this._invBox.copy(this._boxMatrix).invert();

    this._localPos.copy(mesh.position).applyMatrix4(this._invBox);
    setBox3FromObjectExcludingLayoutProxy(this._worldBox, mesh);
    this.expandAabbToBoxLocal(this._worldBox, boxEntry.mesh, this._localBox);

    const targets = collectRemateSnapTargets({
      boxMesh: boxEntry.mesh,
      widthM: boxConfig.widthM,
      heightM: boxConfig.heightM,
      depthM: boxConfig.depthM,
      boxMeta: boxConfig.box ?? null,
    });

    let best: { plane: RemateSnapPlane; distanceM: number } | null = null;
    for (const plane of targets) {
      const signedM = signedDistanceRemateFaceToPlane(this._localBox, plane);
      const absM = Math.abs(signedM);
      if (absM > captureM) continue;
      if (
        !best ||
        plane.priority < best.plane.priority ||
        (plane.priority === best.plane.priority && absM < Math.abs(best.distanceM))
      ) {
        best = { plane, distanceM: signedM };
      }
    }

    if (best) {
      const strength = this.computeStrength(Math.abs(best.distanceM), captureM, magnet);
      const deltaLocal = best.plane.normalM.clone().multiplyScalar(-best.distanceM * strength);
      this._localPos.add(deltaLocal);
      this._localPos.applyMatrix4(this._boxMatrix);
      mesh.position.copy(this._localPos);
      this.activeSnapPoint = mesh.position.clone();
      this.drawOverlay();
      return;
    }

    this.activeSnapPoint = null;
    this.clearOverlay();
  }

  applyStandaloneGridSnap(mesh: THREE.Mesh): void {
    if (!this.enabled || !this.dragging) return;
    const g = mmToM(this.gridSizeMm);
    mesh.position.x = Math.round(mesh.position.x / g) * g;
    mesh.position.z = Math.round(mesh.position.z / g) * g;
  }

  private computeStrength(distanceM: number, captureM: number, magnet: number): number {
    const t = THREE.MathUtils.clamp(1 - distanceM / captureM, 0, 1);
    return (0.1 + 0.9 * t * t * t) * magnet;
  }

  private expandAabbToBoxLocal(worldBox: THREE.Box3, boxMesh: THREE.Object3D, out: THREE.Box3): void {
    out.makeEmpty();
    boxMesh.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(boxMesh.matrixWorld).invert();
    const { min, max } = worldBox;
    for (const x of [min.x, max.x]) {
      for (const y of [min.y, max.y]) {
        for (const z of [min.z, max.z]) {
          this._corner.set(x, y, z).applyMatrix4(inv);
          out.expandByPoint(this._corner);
        }
      }
    }
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
    canvas.style.zIndex = "16";
    canvas.style.background = "transparent";
    canvas.style.display = "none";
    container.appendChild(canvas);
    this.overlayCanvas = canvas;
    this.overlayCtx = canvas.getContext("2d");
    this.resize();
  }

  private resize(): void {
    if (!this.overlayCanvas) return;
    const container = this.deps.getContainer();
    const w = Math.max(1, container.clientWidth || 1);
    const h = Math.max(1, container.clientHeight || 1);
    if (this.overlayCanvas.width !== w) this.overlayCanvas.width = w;
    if (this.overlayCanvas.height !== h) this.overlayCanvas.height = h;
  }

  private drawOverlay(): void {
    if (!this.overlayCanvas || !this.overlayCtx || !this.activeSnapPoint) return;
    this.resize();
    const ctx = this.overlayCtx;
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.overlayCanvas.style.display = "block";

    const screen = this.deps.projectWorldToScreen(this.activeSnapPoint);
    if (!screen) return;

    ctx.strokeStyle = "#38bdf8";
    ctx.fillStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private clearOverlay(): void {
    if (!this.overlayCanvas || !this.overlayCtx) return;
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.overlayCanvas.style.display = "none";
  }

  dispose(): void {
    this.onDragEnd();
    if (this.overlayCanvas) {
      this.overlayCanvas.remove();
      this.overlayCanvas = null;
      this.overlayCtx = null;
    }
  }
}
