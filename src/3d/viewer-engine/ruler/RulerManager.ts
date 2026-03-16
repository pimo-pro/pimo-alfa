import * as THREE from "three";
import type { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import type { ViewerBoxManager } from "../box/BoxManager";
import type { RoomManager } from "../../room/RoomManager";
import type {
  RulerManagerAnchor,
  RulerManagerDependencies,
  RulerManagerMeasurement,
  RulerManagerResult,
  RulerManagerSnapshot,
} from "./types";
import { buildWorldBox, centerOfRange, overlapRange, toMmRound } from "./measurementUtils";

const AUTO_THRESHOLD_METERS = 0.3;

export type RulerManagerBoxData = {
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
};

export type RulerManagerRoomBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

export type RulerManagerOtherBox = {
  min: THREE.Vector3;
  max: THREE.Vector3;
  centerX: number;
};

function emptyResult(): RulerManagerResult {
  return {
    horizontalLeft: null,
    horizontalRight: null,
    front: null,
    back: null,
    floor: null,
    ceiling: null,
  };
}

function toMeasurement(pointA: THREE.Vector3, pointB: THREE.Vector3): RulerManagerMeasurement {
  return {
    distanceMm: toMmRound(pointA.distanceTo(pointB)),
    pointA: pointA.clone(),
    pointB: pointB.clone(),
  };
}

function isBetter(next: RulerManagerMeasurement | null, current: RulerManagerMeasurement | null): boolean {
  if (!next) return false;
  if (!current) return true;
  return next.distanceMm < current.distanceMm;
}

function resolveSnapType(object: THREE.Object3D): "caixa" | "parede" | "chão" | "furo" | "ponto" {
  let current: THREE.Object3D | null = object;
  while (current) {
    const data = current.userData as Record<string, unknown>;
    const name = `${current.name ?? ""}`.toLowerCase();
    if (data?.isRoomFloor === true) return "chão";
    if (data?.isRoomWall === true || typeof data?.wallId === "number") return "parede";
    if (
      data?.isDrill === true ||
      data?.isHole === true ||
      typeof data?.doorLayerId === "string" ||
      typeof data?.drawerLayerId === "string" ||
      name.includes("hole") ||
      name.includes("drill") ||
      name.includes("porta") ||
      name.includes("gaveta")
    ) {
      return "furo";
    }
    if (typeof data?.boxId === "string" && data.boxId.length > 0) return "caixa";
    current = current.parent;
  }
  return "ponto";
}

function collectAnchors(object: THREE.Object3D, hitPoint: THREE.Vector3): RulerManagerAnchor[] {
  const out: RulerManagerAnchor[] = [];
  const type = resolveSnapType(object);
  const box = buildWorldBox(object);
  if (!box.isEmpty()) {
    const min = box.min;
    const max = box.max;
    const center = box.getCenter(new THREE.Vector3());
    const corners = [
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(min.x, min.y, max.z),
      new THREE.Vector3(min.x, max.y, min.z),
      new THREE.Vector3(min.x, max.y, max.z),
      new THREE.Vector3(max.x, min.y, min.z),
      new THREE.Vector3(max.x, min.y, max.z),
      new THREE.Vector3(max.x, max.y, min.z),
      new THREE.Vector3(max.x, max.y, max.z),
    ];
    out.push({ point: center, object, type });
    corners.forEach((point) => out.push({ point, object, type: "ponto" }));
  }
  out.push({ point: hitPoint.clone(), object, type });
  return out;
}

function findAnchorRoot(
  object: THREE.Object3D,
  boxManager: ViewerBoxManager,
  roomManager: RoomManager | null
): THREE.Object3D {
  let current: THREE.Object3D | null = object;
  while (current) {
    const data = current.userData as Record<string, unknown>;
    if (typeof data?.boxId === "string") {
      return boxManager.getEntry(data.boxId)?.mesh ?? current;
    }
    if (data?.isRoomFloor === true) {
      return roomManager?.floor ?? current;
    }
    if (typeof data?.wallId === "number" || data?.isRoomWall === true) {
      const wallId = typeof data?.wallId === "number" ? data.wallId : null;
      if (roomManager && wallId !== null) {
        const wall =
          roomManager.wallsMain.find((w) => w.userData?.wallId === wallId) ??
          roomManager.wallsExtra.find((w) => w.userData?.wallId === wallId);
        if (wall) return wall;
      }
      return current;
    }
    current = current.parent;
  }
  return object;
}

function pickClosestAnchor(anchors: RulerManagerAnchor[], hitPoint: THREE.Vector3): RulerManagerAnchor | null {
  if (!anchors.length) return null;
  let best = anchors[0];
  let bestDistSq = best.point.distanceToSquared(hitPoint);
  for (let i = 1; i < anchors.length; i += 1) {
    const d = anchors[i].point.distanceToSquared(hitPoint);
    if (d < bestDistSq) {
      best = anchors[i];
      bestDistSq = d;
    }
  }
  return best;
}

export class RulerManager {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.Camera;
  private readonly transformControls: TransformControls | null;
  private readonly viewerBoxManager: ViewerBoxManager;
  private readonly roomManager: RoomManager | null;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly group = new THREE.Group();
  private readonly autoLineMaterial = new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.85 });
  private readonly manualLineMaterial = new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.95 });
  private readonly autoLines: THREE.Line[] = [];
  private manualLine: THREE.Line | null = null;
  private previewLine: THREE.Line | null = null;
  private manualEnabled = false;
  private manualA: RulerManagerAnchor | null = null;
  private manualB: RulerManagerAnchor | null = null;
  private currentAuto: RulerManagerResult = emptyResult();
  private referenceBoxId: string | null = null;
  private readonly onTransformChange = () => {
    this.updateMeasurements();
  };

  constructor(deps: RulerManagerDependencies) {
    this.scene = deps.scene;
    this.camera = deps.camera;
    this.transformControls = deps.transformControls;
    this.viewerBoxManager = deps.viewerBoxManager;
    this.roomManager = deps.roomManager;
    this.group.name = "ruler-manager-measurements";
    this.scene.add(this.group);
    this.transformControls?.addEventListener("change", this.onTransformChange);
  }

  enable(): void {
    this.manualEnabled = true;
  }

  disable(): void {
    this.manualEnabled = false;
    this.manualA = null;
    this.manualB = null;
    this.clearManualLine();
    this.clearPreviewLine();
  }

  setReferenceBoxId(boxId: string | null): void {
    this.referenceBoxId = boxId;
  }

  onPointerDown(event: { clientX: number; clientY: number }, domElement: HTMLElement): void {
    if (!this.manualEnabled) return;
    const anchor = this.getSnapPoint(event, domElement);
    if (!anchor) return;
    if (!this.manualA || this.manualB) {
      this.manualA = anchor;
      this.manualB = null;
      this.clearManualLine();
      this.clearPreviewLine();
      return;
    }
    this.manualB = anchor;
    this.clearPreviewLine();
    this.redrawManualLine();
  }

  onPointerMove(event: { clientX: number; clientY: number }, domElement: HTMLElement): void {
    if (!this.manualEnabled || !this.manualA || this.manualB) {
      this.clearPreviewLine();
      return;
    }
    const previewAnchor = this.getSnapPoint(event, domElement);
    if (!previewAnchor) {
      this.clearPreviewLine();
      return;
    }
    this.redrawPreviewLine(this.manualA.point, previewAnchor.point);
  }

  getManualMeasurement(): RulerManagerMeasurement | null {
    if (!this.manualA || !this.manualB) return null;
    return toMeasurement(this.manualA.point, this.manualB.point);
  }

  getSnapPoint(event: { clientX: number; clientY: number }, domElement: HTMLElement): RulerManagerAnchor | null {
    const rect = domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const roots: THREE.Object3D[] = [];
    this.viewerBoxManager.getBoxes().forEach((entry) => roots.push(entry.mesh));
    if (this.roomManager) {
      roots.push(...this.roomManager.wallsMain, ...this.roomManager.wallsExtra);
      if (this.roomManager.floor) roots.push(this.roomManager.floor);
    }

    const hits = this.raycaster.intersectObjects(roots, true);
    if (!hits.length) return null;
    const hit = hits[0];
    const anchorObject = findAnchorRoot(hit.object, this.viewerBoxManager, this.roomManager);
    const anchorCandidates = collectAnchors(anchorObject, hit.point);
    return pickClosestAnchor(anchorCandidates, hit.point);
  }

  getAutoMeasurements(referenceBoxId: string | null): RulerManagerResult {
    this.referenceBoxId = referenceBoxId;
    return this.updateMeasurements();
  }

  updateMeasurements(): RulerManagerResult {
    const next = this.computeAutoMeasurements(this.referenceBoxId);
    this.currentAuto = next;
    this.redrawAutoLines(next);
    return next;
  }

  snapshot(): RulerManagerSnapshot {
    return {
      auto: this.currentAuto,
      manual: this.getManualMeasurement(),
      manualEnabled: this.manualEnabled,
    };
  }

  dispose(): void {
    this.transformControls?.removeEventListener("change", this.onTransformChange);
    this.clearAutoLines();
    this.clearManualLine();
    this.clearPreviewLine();
    this.scene.remove(this.group);
    this.autoLineMaterial.dispose();
    this.manualLineMaterial.dispose();
  }

  private computeAutoMeasurements(referenceBoxId: string | null): RulerManagerResult {
    const out = emptyResult();
    if (!referenceBoxId) return out;
    const refEntry = this.viewerBoxManager.getEntry(referenceBoxId);
    if (!refEntry?.mesh) return out;

    const refBox = buildWorldBox(refEntry.mesh);
    if (refBox.isEmpty()) return out;

    const processTarget = (targetBox: THREE.Box3) => {
      if (targetBox.isEmpty()) return;
      const yz = overlapRange(refBox.min.y, refBox.max.y, targetBox.min.y, targetBox.max.y);
      const zz = overlapRange(refBox.min.z, refBox.max.z, targetBox.min.z, targetBox.max.z);
      const xy = overlapRange(refBox.min.x, refBox.max.x, targetBox.min.x, targetBox.max.x);
      const yy = overlapRange(refBox.min.y, refBox.max.y, targetBox.min.y, targetBox.max.y);
      const xz = overlapRange(refBox.min.x, refBox.max.x, targetBox.min.x, targetBox.max.x);
      const zzForY = overlapRange(refBox.min.z, refBox.max.z, targetBox.min.z, targetBox.max.z);

      if (yz && zz) {
        const y = centerOfRange(yz[0], yz[1]);
        const z = centerOfRange(zz[0], zz[1]);
        const leftGap = refBox.min.x - targetBox.max.x;
        if (leftGap >= 0 && leftGap <= AUTO_THRESHOLD_METERS) {
          const candidate = toMeasurement(
            new THREE.Vector3(refBox.min.x, y, z),
            new THREE.Vector3(targetBox.max.x, y, z)
          );
          if (isBetter(candidate, out.horizontalLeft)) out.horizontalLeft = candidate;
        }
        const rightGap = targetBox.min.x - refBox.max.x;
        if (rightGap >= 0 && rightGap <= AUTO_THRESHOLD_METERS) {
          const candidate = toMeasurement(
            new THREE.Vector3(refBox.max.x, y, z),
            new THREE.Vector3(targetBox.min.x, y, z)
          );
          if (isBetter(candidate, out.horizontalRight)) out.horizontalRight = candidate;
        }
      }

      if (xy && yy) {
        const x = centerOfRange(xy[0], xy[1]);
        const y = centerOfRange(yy[0], yy[1]);
        const frontGap = refBox.min.z - targetBox.max.z;
        if (frontGap >= 0 && frontGap <= AUTO_THRESHOLD_METERS) {
          const candidate = toMeasurement(
            new THREE.Vector3(x, y, refBox.min.z),
            new THREE.Vector3(x, y, targetBox.max.z)
          );
          if (isBetter(candidate, out.front)) out.front = candidate;
        }
        const backGap = targetBox.min.z - refBox.max.z;
        if (backGap >= 0 && backGap <= AUTO_THRESHOLD_METERS) {
          const candidate = toMeasurement(
            new THREE.Vector3(x, y, refBox.max.z),
            new THREE.Vector3(x, y, targetBox.min.z)
          );
          if (isBetter(candidate, out.back)) out.back = candidate;
        }
      }

      if (xz && zzForY) {
        const x = centerOfRange(xz[0], xz[1]);
        const z = centerOfRange(zzForY[0], zzForY[1]);
        const floorGap = refBox.min.y - targetBox.max.y;
        if (floorGap >= 0 && floorGap <= AUTO_THRESHOLD_METERS) {
          const candidate = toMeasurement(
            new THREE.Vector3(x, refBox.min.y, z),
            new THREE.Vector3(x, targetBox.max.y, z)
          );
          if (isBetter(candidate, out.floor)) out.floor = candidate;
        }
        const ceilGap = targetBox.min.y - refBox.max.y;
        if (ceilGap >= 0 && ceilGap <= AUTO_THRESHOLD_METERS) {
          const candidate = toMeasurement(
            new THREE.Vector3(x, refBox.max.y, z),
            new THREE.Vector3(x, targetBox.min.y, z)
          );
          if (isBetter(candidate, out.ceiling)) out.ceiling = candidate;
        }
      }
    };

    this.viewerBoxManager.getBoxes().forEach((entry, boxId) => {
      if (boxId === referenceBoxId || !entry.mesh) return;
      processTarget(buildWorldBox(entry.mesh));
    });

    if (this.roomManager) {
      this.roomManager.wallsMain.forEach((wall) => processTarget(buildWorldBox(wall)));
      this.roomManager.wallsExtra.forEach((wall) => processTarget(buildWorldBox(wall)));
      if (this.roomManager.floor) processTarget(buildWorldBox(this.roomManager.floor));
    }

    return out;
  }

  private clearAutoLines(): void {
    this.autoLines.forEach((line) => {
      this.group.remove(line);
      line.geometry.dispose();
    });
    this.autoLines.length = 0;
  }

  private clearManualLine(): void {
    if (!this.manualLine) return;
    this.group.remove(this.manualLine);
    this.manualLine.geometry.dispose();
    this.manualLine = null;
  }

  private clearPreviewLine(): void {
    if (!this.previewLine) return;
    this.group.remove(this.previewLine);
    this.previewLine.geometry.dispose();
    this.previewLine = null;
  }

  private redrawAutoLines(result: RulerManagerResult): void {
    this.clearAutoLines();
    const items = [
      result.horizontalLeft,
      result.horizontalRight,
      result.front,
      result.back,
      result.floor,
      result.ceiling,
    ];
    items.forEach((measurement) => {
      if (!measurement) return;
      const geometry = new THREE.BufferGeometry().setFromPoints([measurement.pointA, measurement.pointB]);
      const line = new THREE.Line(geometry, this.autoLineMaterial);
      line.renderOrder = 1200;
      this.group.add(line);
      this.autoLines.push(line);
    });
  }

  private redrawManualLine(): void {
    this.clearManualLine();
    if (!this.manualA || !this.manualB) return;
    const geometry = new THREE.BufferGeometry().setFromPoints([this.manualA.point, this.manualB.point]);
    this.manualLine = new THREE.Line(geometry, this.manualLineMaterial);
    this.manualLine.renderOrder = 1201;
    this.group.add(this.manualLine);
  }

  private redrawPreviewLine(from: THREE.Vector3, to: THREE.Vector3): void {
    this.clearPreviewLine();
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    this.previewLine = new THREE.Line(geometry, this.manualLineMaterial);
    this.previewLine.renderOrder = 1200.5;
    this.group.add(this.previewLine);
  }
}

/**
 * Compatibilidade: assinatura antiga usada no ViewerCore.
 * Mantém cálculo de distâncias por faces usando os dados já normalizados.
 */
export function getRulerMeasurements(
  box: RulerManagerBoxData,
  roomBounds: RulerManagerRoomBounds | null,
  otherBoxesSortedByX: RulerManagerOtherBox[]
): RulerManagerResult {
  const out = emptyResult();
  const refBox = new THREE.Box3(box.min.clone(), box.max.clone());

  const processOther = (other: RulerManagerOtherBox) => {
    const target = new THREE.Box3(other.min.clone(), other.max.clone());
    const yz = overlapRange(refBox.min.y, refBox.max.y, target.min.y, target.max.y);
    const zz = overlapRange(refBox.min.z, refBox.max.z, target.min.z, target.max.z);
    if (yz && zz) {
      const y = centerOfRange(yz[0], yz[1]);
      const z = centerOfRange(zz[0], zz[1]);
      const leftGap = refBox.min.x - target.max.x;
      if (leftGap >= 0 && leftGap <= AUTO_THRESHOLD_METERS) {
        const m = toMeasurement(new THREE.Vector3(refBox.min.x, y, z), new THREE.Vector3(target.max.x, y, z));
        if (isBetter(m, out.horizontalLeft)) out.horizontalLeft = m;
      }
      const rightGap = target.min.x - refBox.max.x;
      if (rightGap >= 0 && rightGap <= AUTO_THRESHOLD_METERS) {
        const m = toMeasurement(new THREE.Vector3(refBox.max.x, y, z), new THREE.Vector3(target.min.x, y, z));
        if (isBetter(m, out.horizontalRight)) out.horizontalRight = m;
      }
    }
  };

  otherBoxesSortedByX.forEach(processOther);

  if (roomBounds) {
    const y = centerOfRange(refBox.min.y, refBox.max.y);
    const z = centerOfRange(refBox.min.z, refBox.max.z);
    const x = centerOfRange(refBox.min.x, refBox.max.x);
    const left = toMeasurement(new THREE.Vector3(refBox.min.x, y, z), new THREE.Vector3(roomBounds.minX, y, z));
    const right = toMeasurement(new THREE.Vector3(refBox.max.x, y, z), new THREE.Vector3(roomBounds.maxX, y, z));
    const front = toMeasurement(new THREE.Vector3(x, y, refBox.min.z), new THREE.Vector3(x, y, roomBounds.minZ));
    const back = toMeasurement(new THREE.Vector3(x, y, refBox.max.z), new THREE.Vector3(x, y, roomBounds.maxZ));
    const floor = toMeasurement(new THREE.Vector3(x, refBox.min.y, z), new THREE.Vector3(x, roomBounds.minY, z));
    const ceiling = toMeasurement(new THREE.Vector3(x, refBox.max.y, z), new THREE.Vector3(x, roomBounds.maxY, z));

    if (left.distanceMm <= AUTO_THRESHOLD_METERS * 1000) out.horizontalLeft = isBetter(left, out.horizontalLeft) ? left : out.horizontalLeft;
    if (right.distanceMm <= AUTO_THRESHOLD_METERS * 1000) out.horizontalRight = isBetter(right, out.horizontalRight) ? right : out.horizontalRight;
    if (front.distanceMm <= AUTO_THRESHOLD_METERS * 1000) out.front = isBetter(front, out.front) ? front : out.front;
    if (back.distanceMm <= AUTO_THRESHOLD_METERS * 1000) out.back = isBetter(back, out.back) ? back : out.back;
    if (floor.distanceMm <= AUTO_THRESHOLD_METERS * 1000) out.floor = isBetter(floor, out.floor) ? floor : out.floor;
    if (ceiling.distanceMm <= AUTO_THRESHOLD_METERS * 1000) out.ceiling = isBetter(ceiling, out.ceiling) ? ceiling : out.ceiling;
  }

  return out;
}

export type { TransformControls, ViewerBoxManager, RoomManager };
