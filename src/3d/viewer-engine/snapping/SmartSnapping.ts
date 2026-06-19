import * as THREE from "three";
import type { ViewerBoxEntry } from "../types";
import { setBox3FromObjectExcludingLayoutProxy } from "../box/boxAabbUtils";
import { mmToM } from "../../../utils/units";
import { collectAdvancedBoxCandidates, collectBasicBoxCandidates } from "./smartSnappingBox";
import { collectAutoAlignmentCandidates } from "./smartSnappingAutoAlign";
import { collectAutoSpacingCandidates } from "./smartSnappingAutoSpacing";
import { collectOpeningCandidates, collectRoomCandidates } from "./smartSnappingRoom";
import { applySmartSnapConstraints } from "./smartSnappingConstraints";
import {
  SNAP_VISUAL,
  kindToAlignment,
  pushCandidate,
  type ActiveAlignmentType,
  type BoxAabb,
  type RoomBoundsLike,
  type RoomOpeningLike,
  type SmartSnapKind,
  type SmartSnapMode,
  type SnapCandidate,
} from "./smartSnappingTypes";
import {
  getWorldPosition,
  setWorldPosition,
  type DragTransformTarget,
} from "../utils/transformDragSpace";

type SmartSnappingDeps = {
  getCamera: () => THREE.Camera;
  getCanvas: () => HTMLCanvasElement;
  getContainer: () => HTMLElement;
  projectWorldToScreen: (_worldPoint: THREE.Vector3) => { x: number; y: number } | null;
  isInternalRulerActive: () => boolean;
  getRoomBounds: () => RoomBoundsLike | null;
  getRoomOpenings: () => RoomOpeningLike[];
  resolveDragTransformTarget: (_logicalMesh: THREE.Object3D) => DragTransformTarget;
};

const MM = (mm: number) => mmToM(mm);
/** Raio de captura fixo para snap center/axis (independente do admin captureRadiusMm). */
const AXIS_CENTER_CAPTURE_MM = 12;

export class SmartSnapping {
  private readonly deps: SmartSnappingDeps;
  private enabled = false;
  private mode: SmartSnapMode = "basic";
  private roomSnappingEnabled = false;
  private autoAlignmentEnabled = true;
  private autoSpacingEnabled = false;
  private gridSizeMm = 10;
  private captureRadiusMm = 12;
  private wallOffsetMm = 0;
  private magnetStrength = 0.85;

  private dragging = false;
  private dragOriginalPosition: THREE.Vector3 | null = null;
  private activeSnapPoint: THREE.Vector3 | null = null;
  private activeSnapFrom: THREE.Vector3 | null = null;
  private activeSnapKind: SmartSnapKind | null = null;
  private activeAlignmentType: ActiveAlignmentType = null;
  private activeDistanceLabelMm: number | null = null;
  private activeGuides: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];

  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayCtx: CanvasRenderingContext2D | null = null;

  private readonly _boxAabb = new THREE.Box3();
  private readonly _tempA = new THREE.Vector3();
  private readonly _tempB = new THREE.Vector3();
  private readonly _tempC = new THREE.Vector3();

  constructor(deps: SmartSnappingDeps) {
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

  isEnabled(): boolean {
    return this.enabled;
  }

  setGridSize(mm: number): void {
    this.gridSizeMm = Math.max(1, mm);
  }

  setCaptureRadius(mm: number): void {
    this.captureRadiusMm = Math.max(1, mm);
  }

  setMagnetStrength(value: number): void {
    this.magnetStrength = THREE.MathUtils.clamp(value, 0, 1);
  }

  getMagnetStrength(): number {
    return this.magnetStrength;
  }

  setMode(mode: SmartSnapMode): void {
    this.mode = mode;
  }

  getMode(): SmartSnapMode {
    return this.mode;
  }

  setRoomSnappingEnabled(enabled: boolean): void {
    this.roomSnappingEnabled = enabled;
  }

  isRoomSnappingEnabled(): boolean {
    return this.roomSnappingEnabled;
  }

  setAutoAlignmentEnabled(enabled: boolean): void {
    this.autoAlignmentEnabled = enabled;
  }

  isAutoAlignmentEnabled(): boolean {
    return this.autoAlignmentEnabled;
  }

  setAutoSpacingEnabled(enabled: boolean): void {
    this.autoSpacingEnabled = enabled;
  }

  isAutoSpacingEnabled(): boolean {
    return this.autoSpacingEnabled;
  }

  setWallOffset(mm: number): void {
    this.wallOffsetMm = Math.max(0, mm);
  }

  getWallOffset(): number {
    return this.wallOffsetMm;
  }

  getActiveAlignmentType(): ActiveAlignmentType {
    return this.activeAlignmentType;
  }

  onDragStart(mesh: THREE.Object3D): void {
    this.dragging = true;
    const { drivenObject } = this.deps.resolveDragTransformTarget(mesh);
    this.dragOriginalPosition = getWorldPosition(drivenObject, new THREE.Vector3());
    this.clearActiveSnap();
  }

  onDragEnd(): void {
    this.dragging = false;
    this.dragOriginalPosition = null;
    this.clearActiveSnap();
    this.clearOverlay();
  }

  applyDuringTranslate(params: {
    mesh: THREE.Object3D;
    dragTransform: DragTransformTarget;
    selectedBoxId: string;
    boxes: Map<string, ViewerBoxEntry>;
    isDragging: boolean;
    currentTool: string;
    roomBounds?: RoomBoundsLike | null;
  }): void {
    const { dragTransform, selectedBoxId, boxes, isDragging, currentTool, roomBounds } = params;
    if (!this.enabled || !isDragging || currentTool !== "translate") {
      this.clearOverlay();
      return;
    }
    if (this.deps.isInternalRulerActive()) {
      this.clearOverlay();
      return;
    }

    const { drivenObject, logicalMesh } = dragTransform;
    const bounds = roomBounds ?? this.deps.getRoomBounds();
    const openings = this.deps.getRoomOpenings();
    const captureM = MM(this.captureRadiusMm);
    const drivenWorldPos = getWorldPosition(drivenObject, this._tempA);
    const best = this.findBestCandidate(
      logicalMesh,
      drivenWorldPos,
      selectedBoxId,
      boxes,
      captureM,
      bounds,
      openings
    );

    if (best) {
      if (!Number.isFinite(best.delta.x + best.delta.y + best.delta.z)) {
        console.warn("[sanity] delta inválido — ignorado");
        return;
      }
      const currentWorld = getWorldPosition(drivenObject, this._tempB);
      const targetWorld = this._tempC.copy(currentWorld).add(best.delta);
      const strength = this.computeSmoothStrength(best.distanceM, captureM);
      currentWorld.lerp(targetWorld, strength);
      setWorldPosition(drivenObject, currentWorld);
      this.activeSnapFrom =
        this.dragOriginalPosition?.clone() ?? getWorldPosition(drivenObject, new THREE.Vector3());
      this.activeSnapPoint = best.snapPoint.clone();
      this.activeSnapKind = best.kind;
      this.activeAlignmentType = best.alignmentType ?? kindToAlignment(best.kind);
      this.activeDistanceLabelMm = best.distanceLabelMm ?? null;
      this.activeGuides = best.guides?.map((g) => ({ start: g.start.clone(), end: g.end.clone() })) ?? [];
      this.drawOverlay();
    } else {
      this.clearActiveSnap();
      this.clearOverlay();
    }

    applySmartSnapConstraints({
      dragTransform,
      selectedBoxId,
      boxes,
      roomBounds: bounds,
      options: {
        wallOffsetMm: this.wallOffsetMm,
        openings: this.roomSnappingEnabled ? openings : [],
      },
    });
  }

  refreshOverlay(): void {
    if (!this.activeSnapPoint || !this.enabled || !this.dragging) {
      this.clearOverlay();
      return;
    }
    this.drawOverlay();
  }

  resize(): void {
    if (!this.overlayCanvas) return;
    const container = this.deps.getContainer();
    const w = Math.max(1, container.clientWidth || 1);
    const h = Math.max(1, container.clientHeight || 1);
    if (this.overlayCanvas.width !== w) this.overlayCanvas.width = w;
    if (this.overlayCanvas.height !== h) this.overlayCanvas.height = h;
    if (this.activeSnapPoint && this.dragging) this.drawOverlay();
  }

  dispose(): void {
    this.onDragEnd();
    if (this.overlayCanvas) {
      this.overlayCanvas.remove();
      this.overlayCanvas = null;
      this.overlayCtx = null;
    }
  }

  private clearActiveSnap(): void {
    this.activeSnapPoint = null;
    this.activeSnapFrom = null;
    this.activeSnapKind = null;
    this.activeAlignmentType = null;
    this.activeDistanceLabelMm = null;
    this.activeGuides = [];
  }

  private computeSmoothStrength(distanceM: number, captureM: number): number {
    const t = THREE.MathUtils.clamp(1 - distanceM / captureM, 0, 1);
    const base = 0.1 + 0.9 * t * t * t;
    return base * this.magnetStrength;
  }

  private findBestCandidate(
    logicalMesh: THREE.Object3D,
    drivenWorldPos: THREE.Vector3,
    selectedBoxId: string,
    boxes: Map<string, ViewerBoxEntry>,
    captureM: number,
    roomBounds: RoomBoundsLike | null,
    openings: RoomOpeningLike[]
  ): SnapCandidate | null {
    const moving = this.getWorldAabb(logicalMesh);
    const getAabb = (m: THREE.Object3D) => this.getWorldAabb(m);
    const candidates: SnapCandidate[] = [];

    if (this.mode === "basic") {
      const axisCenterCaptureM = MM(AXIS_CENTER_CAPTURE_MM);
      this.collectGridCandidates(drivenWorldPos, captureM, candidates);
      this.collectAxisCandidates(drivenWorldPos, axisCenterCaptureM, roomBounds, candidates);
      this.collectCenterCandidates(moving, axisCenterCaptureM, roomBounds, candidates);
      boxes.forEach((entry, boxId) => {
        if (boxId === selectedBoxId) return;
        collectBasicBoxCandidates(moving, getAabb(entry.mesh), captureM, candidates);
      });
    } else {
      if (this.roomSnappingEnabled && roomBounds) {
        collectRoomCandidates(moving, roomBounds, captureM, candidates, { wallOffsetMm: this.wallOffsetMm });
        if (openings.length) {
          collectOpeningCandidates(moving, openings, captureM, candidates);
        }
      }

      boxes.forEach((entry, boxId) => {
        if (boxId === selectedBoxId) return;
        collectAdvancedBoxCandidates(moving, getAabb(entry.mesh), captureM, candidates);
      });

      if (this.autoAlignmentEnabled) {
        collectAutoAlignmentCandidates(moving, boxes, selectedBoxId, captureM, getAabb, candidates);
      }

      if (this.autoSpacingEnabled) {
        collectAutoSpacingCandidates(moving, selectedBoxId, boxes, captureM, getAabb, candidates);
      }

      this.collectGridCandidates(drivenWorldPos, captureM, candidates);
    }

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.distanceM - b.distanceM;
    });

    return candidates[0];
  }

  private collectGridCandidates(position: THREE.Vector3, captureM: number, out: SnapCandidate[]): void {
    const step = MM(this.gridSizeMm);
    const axes: Array<"x" | "y" | "z"> = ["x", "y", "z"];
    for (const axis of axes) {
      const current = position[axis];
      const snapped = Math.round(current / step) * step;
      const delta = snapped - current;
      const distanceM = Math.abs(delta);
      if (distanceM > captureM) continue;
      const deltaVec = new THREE.Vector3();
      deltaVec[axis] = delta;
      const snapPoint = position.clone();
      snapPoint[axis] = snapped;
      pushCandidate(out, { kind: "grid", delta: deltaVec, snapPoint, distanceM });
    }
  }

  private collectAxisCandidates(
    position: THREE.Vector3,
    captureM: number,
    roomBounds: RoomBoundsLike | null,
    out: SnapCandidate[]
  ): void {
    if (this.mode !== "basic") return;
    if (!roomBounds) return;

    const axes: Array<"x" | "z"> = ["x", "z"];
    for (const axis of axes) {
      const target = axis === "x" ? roomBounds.centerX : roomBounds.centerZ;
      const current = position[axis];
      const distanceM = Math.abs(current - target);
      if (distanceM > captureM) continue;
      const deltaVec = new THREE.Vector3();
      deltaVec[axis] = target - current;
      const snapPoint = position.clone();
      snapPoint.x = roomBounds.centerX;
      snapPoint.z = roomBounds.centerZ;
      pushCandidate(out, { kind: "axis", delta: deltaVec, snapPoint, distanceM });
    }
  }

  private collectCenterCandidates(
    moving: BoxAabb,
    captureM: number,
    roomBounds: RoomBoundsLike | null,
    out: SnapCandidate[]
  ): void {
    if (this.mode !== "basic") return;
    if (!roomBounds) return;

    const snapPoint = new THREE.Vector3(roomBounds.centerX, moving.center.y, roomBounds.centerZ);
    const delta = snapPoint.clone().sub(moving.center);
    const distanceM = delta.length();
    if (distanceM > captureM) return;
    pushCandidate(out, {
      kind: "center",
      delta,
      snapPoint,
      distanceM,
    });
  }

  private getWorldAabb(mesh: THREE.Object3D): BoxAabb {
    mesh.updateMatrixWorld(true);
    setBox3FromObjectExcludingLayoutProxy(this._boxAabb, mesh);
    const center = this._boxAabb.getCenter(new THREE.Vector3());
    return {
      min: this._boxAabb.min.clone(),
      max: this._boxAabb.max.clone(),
      center,
    };
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

  private drawOverlay(): void {
    if (!this.overlayCanvas || !this.overlayCtx || !this.activeSnapPoint || !this.activeSnapKind) return;
    this.resize();
    const ctx = this.overlayCtx;
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.overlayCanvas.style.display = "block";

    const visual = SNAP_VISUAL[this.activeSnapKind];
    const snapScreen = this.deps.projectWorldToScreen(this.activeSnapPoint);
    if (!snapScreen) return;

    for (const guide of this.activeGuides) {
      const a = this.deps.projectWorldToScreen(guide.start);
      const b = this.deps.projectWorldToScreen(guide.end);
      if (!a || !b) continue;
      ctx.strokeStyle = visual.dash;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      this.drawDirectionArrow(ctx, a, b, visual.color);
    }

    if (this.activeSnapFrom) {
      const fromScreen = this.deps.projectWorldToScreen(this.activeSnapFrom);
      if (fromScreen) {
        ctx.strokeStyle = `${visual.dash}aa`;
        ctx.lineWidth = 1.75;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(fromScreen.x, fromScreen.y);
        ctx.lineTo(snapScreen.x, snapScreen.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.fillStyle = visual.color;
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(snapScreen.x, snapScreen.y, visual.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const labelParts = [visual.label];
    if (this.activeAlignmentType) labelParts.push(`(${this.activeAlignmentType})`);
    if (this.activeDistanceLabelMm != null) labelParts.push(`${this.activeDistanceLabelMm.toFixed(0)} mm`);
    const label = labelParts.join(" · ");

    ctx.font = "600 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const labelW = ctx.measureText(label).width + 12;
    const labelY = snapScreen.y - visual.radius - 8;
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.beginPath();
    ctx.roundRect(snapScreen.x - labelW / 2, labelY - 14, labelW, 16, 4);
    ctx.fill();
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(label, snapScreen.x, labelY);
  }

  private drawDirectionArrow(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    color: string
  ): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 12) return;
    const ux = dx / len;
    const uy = dy / len;
    const tipX = to.x;
    const tipY = to.y;
    const size = 5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - ux * size - uy * size * 0.5, tipY - uy * size + ux * size * 0.5);
    ctx.lineTo(tipX - ux * size + uy * size * 0.5, tipY - uy * size - ux * size * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  private clearOverlay(): void {
    if (!this.overlayCanvas || !this.overlayCtx) return;
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.overlayCanvas.style.display = "none";
  }
}

export type { SmartSnapKind, SmartSnapMode, RoomBoundsLike, ActiveAlignmentType };
