import type * as THREE from "three";
import type { RematePiece } from "../../../core/remate/rematePieceTypes";
import type { ProjectRodape } from "../../../core/rodape/rodapeTypes";
import type { ViewerBoxEntry } from "../types";
import type { RemateSmartSnapBoxConfig } from "./RemateSmartSnapping";
import type { BoxAabb, RoomBoundsLike, RoomOpeningLike } from "./smartSnappingTypes";

export type SmartSnapEntityKind = "box" | "remate" | "rodape" | "room";

export type ExplicitAlignMode =
  | "front"
  | "back"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "auto"
  | "flushFront"
  | "flushBack"
  | "flushLeft"
  | "flushRight"
  | "depthAlign"
  | "continueLine"
  | "alignDoor"
  | "alignDrawer";

export type SmartSnapEntity = {
  kind: SmartSnapEntityKind;
  id: string;
  mesh: THREE.Mesh;
  parentBoxId?: string;
};

export type UnifiedSnapCandidate = {
  delta: THREE.Vector3;
  distanceM: number;
  priority: number;
  kind: string;
  targetId: string;
  targetKind: SmartSnapEntityKind;
};

export type UnifiedSnapResult = {
  applied: boolean;
  candidateKind?: string;
  targetId?: string;
  targetKind?: SmartSnapEntityKind;
  delta?: import("three").Vector3;
};

export type PredictSnapResult = {
  candidate: UnifiedSnapCandidate | null;
  predictivePosition: import("three").Vector3 | null;
};

export type SmartSnapTransformMode = "magnetic" | "immediate";

export type RoomBoundsSnapLike = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type SmartAlignSnapContext = {
  boxes: Map<string, ViewerBoxEntry>;
  captureRadiusM: number;
  magnetStrength: number;
  rematePieces: RematePiece[];
  rodapes: ProjectRodape[];
  getBoxConfig: (boxId: string) => RemateSmartSnapBoxConfig | null;
  getWorldAabb: (mesh: THREE.Object3D) => BoxAabb;
  roomBounds?: RoomBoundsSnapLike | null;
  roomBoundsFull?: RoomBoundsLike | null;
  roomOpenings?: RoomOpeningLike[];
  wallOffsetMm?: number;
  explicitModeActive?: boolean;
  allEntities?: SmartSnapEntity[];
};

export const DEFAULT_UNIFIED_CAPTURE_MM = 12;
export const DEFAULT_UNIFIED_MAGNET = 0.85;
