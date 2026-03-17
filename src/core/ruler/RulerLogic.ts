import * as THREE from "three";
import {
  distanceBoxToFloor,
  distanceBoxToWall,
  distancePoint3D,
  getLateralFaceToFaceMeasurements,
  getHorizontalDistance,
  getVerticalDistance,
} from "./RulerGeometry";
import { createInitialRulerState, type MeasurementAnchor, type MeasurementType, type RulerMode, type RulerState } from "./RulerState";

export type AutoMeasurement = {
  start: THREE.Vector3;
  end: THREE.Vector3;
  valueMm: number;
  type: MeasurementType;
  color: string;
  label?: string;
};

type LogicDeps = { applyDistanceDeltaMm: (_delta: THREE.Vector3) => void };
type SnapFamily = "vertex" | "edge" | "hole" | "face" | "center" | "point";
export type ManualMeasurementMetrics = {
  total: number;
  dx: number;
  dy: number;
  dz: number;
  horizontal: number;
  vertical: number;
  lateral: number | null;
};

const AUTO_DISTANCE_LIMIT_MM = 350;

function colorByDistance(mm: number): string {
  if (mm > 900) return "#22c55e";
  if (mm >= 450) return "#f59e0b";
  return "#ef4444";
}

function typeFromPoints(a: THREE.Vector3, b: THREE.Vector3): MeasurementType {
  const h = getHorizontalDistance(a, b);
  const v = getVerticalDistance(a, b);
  return v > h ? "vertical" : v === 0 ? "horizontal" : "diagonal";
}

function familyFromAnchor(anchor: MeasurementAnchor): SnapFamily {
  if (anchor.kind === "box-vertex") return "vertex";
  if (anchor.kind === "box-edge") return "edge";
  if (anchor.kind === "hole-center") return "hole";
  if (anchor.kind === "box-center" || anchor.kind === "wall-center") return "center";
  if (anchor.kind === "box-face" || anchor.kind === "box-face-center" || anchor.kind === "wall-plane" || anchor.kind === "floor-plane") {
    return "face";
  }
  return "point";
}

export class RulerLogic {
  state: RulerState = createInitialRulerState();
  autoMeasurements: AutoMeasurement[] = [];
  private deps: LogicDeps;
  private measuring = false;
  private manualHadMove = false;
  private pendingCenterDeltaMm: number | null = null;
  private lockedFamily: SnapFamily | null = null;
  private manualLabel: string | null = null;
  private manualMetrics: ManualMeasurementMetrics | null = null;

  constructor(deps: LogicDeps) {
    this.deps = deps;
  }

  setMode(mode: RulerMode): void {
    this.state.mode = mode;
    if (mode === "OFF") {
      this.state.startPoint = null;
      this.state.endPoint = null;
      this.state.currentValue = null;
      this.autoMeasurements = [];
      this.pendingCenterDeltaMm = null;
      this.measuring = false;
      this.manualHadMove = false;
      this.lockedFamily = null;
      this.manualLabel = null;
      this.manualMetrics = null;
    }
  }

  clearMeasurements(): void {
    this.autoMeasurements = [];
    this.pendingCenterDeltaMm = null;
    this.state.startPoint = null;
    this.state.endPoint = null;
    this.state.currentValue = null;
    this.measuring = false;
    this.manualHadMove = false;
    this.lockedFamily = null;
    this.manualLabel = null;
    this.manualMetrics = null;
  }

  clearAutoMeasurement(): void {
    this.autoMeasurements = [];
    this.pendingCenterDeltaMm = null;
    if (this.state.mode === "OFF") {
      this.state.startPoint = null;
      this.state.endPoint = null;
      this.state.currentValue = null;
    }
  }

  handlePointerDown(snapPoint: THREE.Vector3, anchor: MeasurementAnchor): void {
    if (this.state.mode !== "ON") return;
    if (this.measuring) return;
    this.state.startPoint = snapPoint.clone();
    this.state.endPoint = snapPoint.clone();
    this.state.currentValue = 0;
    this.lockedFamily = familyFromAnchor(anchor);
    const metrics = this.buildManualMetrics(this.state.startPoint, this.state.endPoint);
    this.manualMetrics = metrics;
    this.manualLabel = this.buildManualLabel(metrics);
    this.measuring = true;
    this.manualHadMove = false;
    this.autoMeasurements = [];
  }

  handlePointerMove(snapPoint: THREE.Vector3, anchor: MeasurementAnchor): void {
    if (this.state.mode !== "ON") return;
    if (!this.measuring || !this.state.startPoint) return;
    if (!this.isAnchorAllowed(anchor)) return;
    this.manualHadMove = true;
    this.state.endPoint = snapPoint.clone();
    this.state.currentValue = distancePoint3D(this.state.startPoint, snapPoint);
    const metrics = this.buildManualMetrics(this.state.startPoint, this.state.endPoint);
    this.manualMetrics = metrics;
    this.manualLabel = this.buildManualLabel(metrics);
  }

  handlePointerUp(snapPoint: THREE.Vector3, anchor: MeasurementAnchor): void {
    if (this.state.mode !== "ON") return;
    if (!this.measuring || !this.state.startPoint) return;
    if (!this.isAnchorAllowed(anchor)) return;
    if (!this.manualHadMove) return;
    this.state.endPoint = snapPoint.clone();
    this.state.currentValue = distancePoint3D(this.state.startPoint, this.state.endPoint);
    this.state.measurementType = typeFromPoints(this.state.startPoint, this.state.endPoint);
    this.measuring = false;
    this.manualHadMove = false;
    this.lockedFamily = null;
    this.manualLabel = null;
    this.manualMetrics = null;
    // Régua ON é temporária: limpa ao finalizar.
    this.state.startPoint = null;
    this.state.endPoint = null;
    this.state.currentValue = null;
  }

  updateAutoDistance(movingObject: THREE.Object3D | null, otherObjects: THREE.Object3D[]): void {
    if (this.state.mode !== "OFF" || this.measuring) return;
    if (!movingObject) {
      this.clearAutoMeasurement();
      return;
    }
    const lateral = getLateralFaceToFaceMeasurements(movingObject, otherObjects);
    const frames: AutoMeasurement[] = [];
    if (lateral.left && lateral.left.distanceMm < AUTO_DISTANCE_LIMIT_MM) {
      frames.push({
        start: lateral.left.pointA.clone(),
        end: lateral.left.pointB.clone(),
        valueMm: lateral.left.distanceMm,
        type: "horizontal",
        color: colorByDistance(lateral.left.distanceMm),
      });
    }
    if (lateral.right && lateral.right.distanceMm < AUTO_DISTANCE_LIMIT_MM) {
      frames.push({
        start: lateral.right.pointA.clone(),
        end: lateral.right.pointB.clone(),
        valueMm: lateral.right.distanceMm,
        type: "horizontal",
        color: colorByDistance(lateral.right.distanceMm),
      });
    }
    if (lateral.centerAligned && lateral.centerDeltaMm != null && frames.length === 2) {
      this.pendingCenterDeltaMm = lateral.centerDeltaMm;
      const centerStart = frames[0].start.clone().lerp(frames[1].start, 0.5);
      const centerEnd = centerStart.clone().add(new THREE.Vector3(0, 0.001, 0));
      frames.push({
        start: centerStart,
        end: centerEnd,
        valueMm: 0,
        type: "horizontal",
        color: "#22c55e",
        label: "center",
      });
    } else {
      this.pendingCenterDeltaMm = null;
    }

    const floor = distanceBoxToFloor(movingObject);
    if (floor.distanceMm > 0) {
      frames.push({
        start: floor.pointA.clone(),
        end: floor.pointB.clone(),
        valueMm: floor.distanceMm,
        type: "vertical",
        color: colorByDistance(floor.distanceMm),
      });
    }

    const byWall = new Map<string, ReturnType<typeof distanceBoxToWall>>();
    otherObjects.forEach((obj) => {
      const wallId = obj.userData?.wallId;
      if (typeof wallId !== "string") return;
      const d = distanceBoxToWall(movingObject, obj);
      const existing = byWall.get(wallId);
      if (!existing || d.distanceMm < existing.distanceMm) byWall.set(wallId, d);
    });
    byWall.forEach((d) => {
      if (d.distanceMm >= AUTO_DISTANCE_LIMIT_MM) return;
      frames.push({
        start: d.pointA.clone(),
        end: d.pointB.clone(),
        valueMm: d.distanceMm,
        type: "horizontal",
        color: colorByDistance(d.distanceMm),
      });
    });

    this.autoMeasurements = frames;
    if (frames.length > 0) {
      this.state.startPoint = frames[0].start.clone();
      this.state.endPoint = frames[0].end.clone();
      this.state.currentValue = frames[0].valueMm;
      this.state.measurementType = frames[0].type;
    } else {
      this.state.startPoint = null;
      this.state.endPoint = null;
      this.state.currentValue = null;
    }
  }

  consumeCenterSnapDelta(): THREE.Vector3 | null {
    if (this.pendingCenterDeltaMm == null) return null;
    const delta = new THREE.Vector3(this.pendingCenterDeltaMm, 0, 0);
    this.pendingCenterDeltaMm = null;
    return delta;
  }

  isManualMeasurementActive(): boolean {
    return this.state.mode === "ON" && this.measuring && this.state.startPoint != null;
  }

  isAnchorAllowed(anchor: MeasurementAnchor): boolean {
    if (!this.measuring || this.lockedFamily == null) return true;
    return familyFromAnchor(anchor) === this.lockedFamily;
  }

  getManualMeasurementLabel(): string | null {
    return this.manualLabel;
  }

  getManualMeasurementMetrics(): ManualMeasurementMetrics | null {
    return this.manualMetrics;
  }

  private buildManualMetrics(start: THREE.Vector3, end: THREE.Vector3): ManualMeasurementMetrics {
    const total = distancePoint3D(start, end);
    const dx = Math.round(Math.abs((end.x - start.x) * 1000));
    const dy = Math.round(Math.abs((end.y - start.y) * 1000));
    const dz = Math.round(Math.abs((end.z - start.z) * 1000));
    const horizontal = getHorizontalDistance(start, end);
    const vertical = getVerticalDistance(start, end);
    const lateral = dx > 0 ? dx : null;
    return { total, dx, dy, dz, horizontal, vertical, lateral };
  }

  private buildManualLabel(metrics: ManualMeasurementMetrics): string {
    const lines = [
      `Distancia total: ${metrics.total} mm`,
      `Dx: ${metrics.dx} mm`,
      `Dy: ${metrics.dy} mm`,
      `Dz: ${metrics.dz} mm`,
      `Horizontal: ${metrics.horizontal} mm`,
      `Vertical: ${metrics.vertical} mm`,
    ];
    if (metrics.lateral != null) lines.push(`Lateral: ${metrics.lateral} mm`);
    return lines.join("\n");
  }

  applyManualValue(valueMm: number): void {
    if (!Number.isFinite(valueMm) || valueMm <= 0) return;
    if (!this.state.startPoint || !this.state.endPoint) return;
    const currentDistance = distancePoint3D(this.state.startPoint, this.state.endPoint);
    if (currentDistance <= 0) return;
    const deltaMm = valueMm - currentDistance;
    const dir = new THREE.Vector3().subVectors(this.state.endPoint, this.state.startPoint).normalize();
    const delta = dir.multiplyScalar(deltaMm);
    this.deps.applyDistanceDeltaMm(delta);
    this.state.currentValue = Math.round(valueMm);
  }
}

