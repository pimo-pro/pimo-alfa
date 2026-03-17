import type { Vector3 } from "three";

export type RulerMode = "OFF" | "ON";
export type MeasurementType = "horizontal" | "vertical" | "diagonal";

export type SnapKind =
  | "box-vertex"
  | "box-edge"
  | "box-face"
  | "box-face-center"
  | "box-center"
  | "hole-center"
  | "wall-plane"
  | "wall-center"
  | "floor-plane"
  | "point";

export interface MeasurementAnchor {
  objectId: string | null;
  localPoint: Vector3;
  worldPoint: Vector3;
  kind: SnapKind;
}

export interface RulerState {
  mode: RulerMode;
  startPoint: Vector3 | null;
  endPoint: Vector3 | null;
  currentValue: number | null;
  snappingActive: boolean;
  measurementType: MeasurementType;
}

export const createInitialRulerState = (): RulerState => ({
  mode: "OFF",
  startPoint: null,
  endPoint: null,
  currentValue: null,
  snappingActive: true,
  measurementType: "diagonal",
});

