import type { CornerOrientation } from "./cornerCabinetRules";
import type { DoorLayerItem } from "../../models/BoxLayers";

/** Folga entre frente fixa e linha de dobradiças (mm). */
export const CORNER_DIREITA_V2_FF_HINGE_GAP_MM = 2;

/** v2 com metadata right-edge — dobradiças numa borda, posX = borda da folha junto à FF. */
export function isCornerV2DoorViewer(
  pivot: DoorLayerItem["pivot"] | undefined,
  hingeSide: DoorLayerItem["hingeSide"] | undefined
): boolean {
  return pivot === "right-edge" && (hingeSide === "left" || hingeSide === "right");
}

/** @deprecated Use isCornerV2DoorViewer */
export function isCornerDireitaInferiorDoorViewer(
  pivot: DoorLayerItem["pivot"] | undefined,
  hingeSide: DoorLayerItem["hingeSide"] | undefined
): boolean {
  return isCornerV2DoorViewer(pivot, hingeSide);
}

/** Linha de dobradiças a partir da frente fixa + folga industrial. */
export function computeCornerV2HingePivotXMm(params: {
  orientation: CornerOrientation;
  fixedFrontCenterXMm: number;
  fixedFrontWidthMm: number;
  hingeGapMm?: number;
}): number {
  const gap = Math.max(0, params.hingeGapMm ?? CORNER_DIREITA_V2_FF_HINGE_GAP_MM);
  const half = params.fixedFrontWidthMm / 2;
  if (params.orientation === "esquerda") {
    return params.fixedFrontCenterXMm - half - gap;
  }
  return params.fixedFrontCenterXMm + half + gap;
}

/** @deprecated Use computeCornerV2HingePivotXMm */
export function computeCornerDireitaV2HingePivotXMm(params: {
  fixedFrontCenterXMm: number;
  fixedFrontWidthMm: number;
  hingeGapMm?: number;
}): number {
  return computeCornerV2HingePivotXMm({ ...params, orientation: "direita" });
}

/**
 * Pivot / offset / rotação outward por orientação.
 * posX guardado = borda da folha na linha FF (right-edge metadata).
 */
export function resolveCornerDoorTransformByOrientation(params: {
  orientation: CornerOrientation;
  /** posX guardado (m) — borda da folha junto às dobradiças. */
  storedPivotEdgeXM: number;
  hingePivotXM: number;
  pivotYM: number;
  pivotZM: number;
  widthM: number;
  baseRotationY: number;
  isOpen: boolean;
  hingeSide: "left" | "right";
}): {
  pivotXM: number;
  pivotYM: number;
  pivotZM: number;
  meshOffsetXM: number;
  rotationY: number;
  openRotationSign: 1 | -1;
} {
  const {
    orientation,
    storedPivotEdgeXM,
    hingePivotXM,
    pivotYM,
    pivotZM,
    widthM,
    baseRotationY,
    isOpen,
    hingeSide,
  } = params;

  const closedCenterXM = storedPivotEdgeXM - widthM / 2;
  const meshOffsetXM = closedCenterXM - hingePivotXM;
  const openRotationSign: 1 | -1 =
    orientation === "esquerda" || hingeSide === "right" ? 1 : -1;
  const openDeltaY = isOpen ? openRotationSign * (Math.PI / 2) : 0;

  return {
    pivotXM: hingePivotXM,
    pivotYM,
    pivotZM,
    meshOffsetXM,
    rotationY: baseRotationY + openDeltaY,
    openRotationSign,
  };
}

/** @deprecated Use resolveCornerDoorTransformByOrientation */
export function resolveCornerDireitaInferiorDoorViewerTransform(params: {
  storedPivotRightXM: number;
  hingePivotXM: number;
  pivotYM: number;
  pivotZM: number;
  widthM: number;
  baseRotationY: number;
  isOpen: boolean;
}): ReturnType<typeof resolveCornerDoorTransformByOrientation> {
  return resolveCornerDoorTransformByOrientation({
    orientation: "direita",
    storedPivotEdgeXM: params.storedPivotRightXM,
    hingePivotXM: params.hingePivotXM,
    pivotYM: params.pivotYM,
    pivotZM: params.pivotZM,
    widthM: params.widthM,
    baseRotationY: params.baseRotationY,
    isOpen: params.isOpen,
    hingeSide: "left",
  });
}

export function cornerDireitaClosedDoorCenterXM(pivotRightEdgeXM: number, widthM: number): number {
  return pivotRightEdgeXM - widthM / 2;
}

/** Borda livre (Z) após rotação — validação outward. */
export function cornerDoorFreeEdgeWorldZ(params: {
  hingePivotXM: number;
  pivotZM: number;
  widthM: number;
  meshOffsetXM: number;
  rotationY: number;
  hingeSide: "left" | "right";
}): number {
  const halfWidth = params.widthM / 2;
  const localFreeX =
    params.hingeSide === "right"
      ? params.meshOffsetXM - halfWidth
      : params.meshOffsetXM + halfWidth;
  return params.pivotZM - Math.sin(params.rotationY) * localFreeX;
}

/** @deprecated Use cornerDoorFreeEdgeWorldZ */
export function cornerDireitaDoorFreeEdgeWorldZ(
  params: Omit<Parameters<typeof cornerDoorFreeEdgeWorldZ>[0], "hingeSide">
): number {
  return cornerDoorFreeEdgeWorldZ({ ...params, hingeSide: "left" });
}
