import * as THREE from "three";
import type { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import type { ViewerBoxEntry } from "../types";
import { setBox3FromObjectExcludingLayoutProxy } from "../box/boxAabbUtils";
import { keepModelInsideRoom, preventModelWallIntersection } from "../../collision/ModelCollision";
import { snapModelToNearestWall, type SnapDebugData } from "../../snapping/ModelWallSnap";
import {
  getWorldPosition,
  setWorldPosition,
  type DragTransformTarget,
} from "../utils/transformDragSpace";

type RoomBoundsLike = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerZ: number;
};

const _worldPos = new THREE.Vector3();
const _worldBefore = new THREE.Vector3();
const _worldAfter = new THREE.Vector3();
const _movementDelta = new THREE.Vector3();

function applyWorldDelta(drivenObject: THREE.Object3D, dx: number, dy: number, dz: number): void {
  if (dx === 0 && dy === 0 && dz === 0) return;
  const world = getWorldPosition(drivenObject, _worldPos);
  world.x += dx;
  world.y += dy;
  world.z += dz;
  setWorldPosition(drivenObject, world);
}

/**
 * Executa constraints no logicalMesh (API legada) e propaga o delta de posição mundial
 * para o drivenObject quando o TransformGizmoPivot está activo.
 */
function propagateLogicalMeshConstraints(
  logicalMesh: THREE.Object3D,
  drivenObject: THREE.Object3D,
  applyFn: () => void
): void {
  const beforeWorld = getWorldPosition(logicalMesh, _worldBefore).clone();
  applyFn();
  if (drivenObject === logicalMesh) return;
  const afterWorld = getWorldPosition(logicalMesh, _worldAfter);
  setWorldPosition(logicalMesh, beforeWorld);
  applyWorldDelta(
    drivenObject,
    afterWorld.x - beforeWorld.x,
    afterWorld.y - beforeWorld.y,
    afterWorld.z - beforeWorld.z
  );
}

export type ClampTransformContext = {
  transformControls: TransformControls | null;
  selectedBoxId: string | null;
  boxes: Map<string, ViewerBoxEntry>;
  currentTool: string;
  lockEnabled: boolean;
  roomBounds: RoomBoundsLike | null;
  roomBoxWalls: Array<{ id: number; mesh: THREE.Mesh }>;
  selectedWallIndex: number | null;
  isTransformControlsDriving: (_mesh: THREE.Object3D) => boolean;
  resolveDragTransformTarget: (_logicalMesh: THREE.Object3D) => DragTransformTarget;
  applyFloorConstraint: (_obj: THREE.Object3D) => void;
  applyRoomConstraint: (_obj: THREE.Object3D, _options?: { ignoreY?: boolean }) => void;
  isMeshInsideOrTouchingRoom: (_obj: THREE.Object3D) => boolean;
  clearSnapState: (_obj: THREE.Object3D) => void;
  shouldUseFeetLock: (_entry: ViewerBoxEntry) => boolean;
  getFixedYForCabinet: (_entry: ViewerBoxEntry) => number;
  updateBoxesIntersectingWalls: () => void;
  setLastSnapDebugData: (_data: SnapDebugData | null) => void;
};

export class TransformConstraints {
  clampTransform(ctx: ClampTransformContext): void {
    if (!ctx.transformControls) return;
    const obj = ctx.transformControls.object;
    if (!obj) return;

    if (ctx.selectedBoxId && ctx.boxes.has(ctx.selectedBoxId)) {
      const entry = ctx.boxes.get(ctx.selectedBoxId)!;
      if (ctx.isTransformControlsDriving(entry.mesh)) {
        if (ctx.currentTool === "translate") {
          const { drivenObject, logicalMesh } = ctx.resolveDragTransformTarget(entry.mesh);

          propagateLogicalMeshConstraints(logicalMesh, drivenObject, () => {
            const snapData = logicalMesh.userData as Record<string, unknown>;
            const currentPos = getWorldPosition(logicalMesh, _worldPos).clone();
            const lastPos =
              snapData.lastSnapPosition instanceof THREE.Vector3
                ? snapData.lastSnapPosition.clone()
                : currentPos.clone();
            _movementDelta.copy(currentPos).sub(lastPos);
            if (_movementDelta.lengthSq() > 1e-10) {
              _movementDelta.normalize();
            }
            snapData.movementDirection = _movementDelta.clone();
            snapData.lastSnapPosition = getWorldPosition(logicalMesh, _worldPos).clone();

            logicalMesh.updateMatrixWorld(true);
            ctx.applyFloorConstraint(logicalMesh);
            if (ctx.lockEnabled) {
              this.applyCollisionConstraint(logicalMesh, ctx.boxes, ctx.selectedBoxId);
            }
            if (ctx.roomBounds && ctx.lockEnabled && ctx.isMeshInsideOrTouchingRoom(logicalMesh)) {
              const wallsMain = ctx.roomBoxWalls
                .map((w) => w.mesh)
                .filter((w) => w.userData?.isMainWall === true);
              const allRoomWalls = ctx.roomBoxWalls.map((w) => w.mesh);

              const snapResult = snapModelToNearestWall(logicalMesh, wallsMain);
              ctx.setLastSnapDebugData(snapResult.debug);
              preventModelWallIntersection(logicalMesh, allRoomWalls);
              keepModelInsideRoom(logicalMesh, ctx.roomBounds);
              ctx.applyRoomConstraint(logicalMesh, { ignoreY: entry.manualPosition });
            } else {
              ctx.clearSnapState(logicalMesh);
              ctx.setLastSnapDebugData(null);
            }
            if (ctx.shouldUseFeetLock(entry) && !entry.manualPosition) {
              logicalMesh.position.y = ctx.getFixedYForCabinet(entry);
            }
          });

          ctx.updateBoxesIntersectingWalls();
        }
        return;
      }
    }

    const wallEntry =
      ctx.selectedWallIndex !== null
        ? ctx.roomBoxWalls.find((w) => w.id === ctx.selectedWallIndex)
        : null;
    if (wallEntry?.mesh === obj) {
      if (ctx.currentTool === "translate") {
        const wall = obj as THREE.Mesh;
        const heightM = ((wall.userData.wallHeightMm as number | undefined) ?? 2700) * 0.001;
        if (wall.position.y < heightM / 2) wall.position.y = heightM / 2;
      } else if (ctx.currentTool === "rotate") {
        (obj as THREE.Mesh).rotation.x = 0;
        (obj as THREE.Mesh).rotation.z = 0;
      }
    }
  }

  applyCollisionConstraint(
    movingMesh: THREE.Object3D,
    boxes: Map<string, ViewerBoxEntry>,
    selectedBoxId: string | null
  ): void {
    const maxIterations = 8;
    for (let iter = 0; iter < maxIterations; iter += 1) {
      movingMesh.updateMatrixWorld(true);
      const movingBox = new THREE.Box3();
      setBox3FromObjectExcludingLayoutProxy(movingBox, movingMesh);
      let anyOverlap = false;
      boxes.forEach((entry, boxId) => {
        if (boxId === selectedBoxId) return;
        entry.mesh.updateMatrixWorld(true);
        const otherBox = new THREE.Box3();
        setBox3FromObjectExcludingLayoutProxy(otherBox, entry.mesh);
        if (!movingBox.intersectsBox(otherBox)) return;
        anyOverlap = true;

        const overlapX = Math.max(
          0,
          Math.min(movingBox.max.x, otherBox.max.x) - Math.max(movingBox.min.x, otherBox.min.x)
        );
        const overlapZ = Math.max(
          0,
          Math.min(movingBox.max.z, otherBox.max.z) - Math.max(movingBox.min.z, otherBox.min.z)
        );
        const overlapY = Math.max(
          0,
          Math.min(movingBox.max.y, otherBox.max.y) - Math.max(movingBox.min.y, otherBox.min.y)
        );
        const minOverlap = Math.min(overlapX, overlapZ, overlapY);
        if (minOverlap <= 0) return;

        const movingCenter = new THREE.Vector3();
        movingBox.getCenter(movingCenter);
        const otherCenter = new THREE.Vector3();
        otherBox.getCenter(otherCenter);

        if (minOverlap === overlapX) {
          const move =
            movingCenter.x < otherCenter.x
              ? otherBox.min.x - movingBox.max.x
              : otherBox.max.x - movingBox.min.x;
          movingMesh.position.x += move;
        } else if (minOverlap === overlapZ) {
          const move =
            movingCenter.z < otherCenter.z
              ? otherBox.min.z - movingBox.max.z
              : otherBox.max.z - movingBox.min.z;
          movingMesh.position.z += move;
        } else {
          const move =
            movingCenter.y < otherCenter.y
              ? otherBox.min.y - movingBox.max.y
              : otherBox.max.y - movingBox.min.y;
          movingMesh.position.y += move;
        }
      });
      if (!anyOverlap) break;
    }
  }
}
