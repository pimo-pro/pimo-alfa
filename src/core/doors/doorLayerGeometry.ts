/**
 * Geometria vertical das portas (DoorLayerItem) — posição no vão e folgas para furação.
 * Convenção: posY = centro vertical da porta no espaço local da caixa (Y=0 no centro).
 */

import type { DoorLayerItem } from "../../models/BoxLayers";

export type DoorVerticalAdjustOrigin = "top" | "bottom";

const MIN_DOOR_HEIGHT_MM = 80;
const MIN_DOOR_WIDTH_MM = 40;

export function resolveDoorOpeningHeightMm(
  boxAlturaMm: number,
  espessuraMm: number,
  calcularAlturaLaterais: boolean
): number {
  const altura = Number(boxAlturaMm) || 0;
  const esp = Number(espessuraMm) || 0;
  return calcularAlturaLaterais ? Math.max(0, altura - esp * 2) : Math.max(0, altura);
}

export function resolveDoorCenterY(door: Pick<DoorLayerItem, "posY">): number {
  return Number.isFinite(door.posY) ? Number(door.posY) : 0;
}

export function computeDoorVerticalGaps(
  openingHeightMm: number,
  doorHeightMm: number,
  doorCenterYMm: number
): { bottomGapMm: number; topGapMm: number } {
  const halfOpening = openingHeightMm / 2;
  const bottomGapMm = doorCenterYMm - doorHeightMm / 2 + halfOpening;
  const topGapMm = halfOpening - doorCenterYMm - doorHeightMm / 2;
  return { bottomGapMm, topGapMm };
}

export function getDoorVerticalEdges(door: Pick<DoorLayerItem, "height" | "posY">): {
  topEdgeMm: number;
  bottomEdgeMm: number;
  centerYMm: number;
} {
  const centerYMm = resolveDoorCenterY(door);
  const half = Math.max(0, Number(door.height) || 0) / 2;
  return {
    centerYMm,
    topEdgeMm: centerYMm + half,
    bottomEdgeMm: centerYMm - half,
  };
}

/** Recalcula altura + posY mantendo a borda superior ou inferior fixa. */
export function applyDoorHeightWithOrigin(
  door: DoorLayerItem,
  nextHeightRaw: number,
  origin: DoorVerticalAdjustOrigin
): Pick<DoorLayerItem, "height" | "posY"> {
  const height = Math.max(MIN_DOOR_HEIGHT_MM, Math.round(nextHeightRaw));
  const { topEdgeMm, bottomEdgeMm } = getDoorVerticalEdges(door);
  if (origin === "top") {
    return { height, posY: topEdgeMm - height / 2 };
  }
  return { height, posY: bottomEdgeMm + height / 2 };
}

/** Mantém a aresta da dobradiça (pivô horizontal) ao alterar a largura. */
export function applyDoorWidthWithPivot(
  door: DoorLayerItem,
  nextWidthRaw: number
): Pick<DoorLayerItem, "width" | "posX"> {
  const width = Math.max(MIN_DOOR_WIDTH_MM, Math.round(nextWidthRaw));
  if (door.pivot === "right-edge") {
    return { width, posX: door.posX };
  }
  if (door.pivot === "left-edge") {
    return { width, posX: door.posX };
  }
  return { width, posX: door.posX };
}

export function mergeDoorDimensionUpdate(
  door: DoorLayerItem,
  partial: Partial<DoorLayerItem> & { applyVerticalAdjustMm?: number },
  openingHeightMm: number
): DoorLayerItem {
  void openingHeightMm;
  const { applyVerticalAdjustMm, ...restPartial } = partial;
  const origin: DoorVerticalAdjustOrigin = restPartial.verticalAdjustOrigin ?? door.verticalAdjustOrigin ?? "top";
  let next: DoorLayerItem = { ...door, ...restPartial, verticalAdjustOrigin: origin };

  if (applyVerticalAdjustMm != null && Number.isFinite(applyVerticalAdjustMm)) {
    const targetHeight = door.height + Number(applyVerticalAdjustMm);
    next = {
      ...next,
      ...applyDoorHeightWithOrigin(door, targetHeight, origin),
      manualDimensions: true,
    };
    return next;
  }

  if (restPartial.height != null && restPartial.height !== door.height) {
    next = {
      ...next,
      ...applyDoorHeightWithOrigin(door, restPartial.height, origin),
      manualDimensions: true,
    };
  }

  if (restPartial.width != null && restPartial.width !== door.width) {
    next = {
      ...next,
      ...applyDoorWidthWithPivot(door, restPartial.width),
      manualDimensions: true,
    };
  }

  return next;
}

export type DoorManualDimensionBackup = {
  width?: number;
  height?: number;
  posX?: number;
  posY?: number;
  verticalAdjustOrigin?: DoorVerticalAdjustOrigin;
  manualDimensions?: boolean;
};

export function backupDoorManualDimensions(door: DoorLayerItem): DoorManualDimensionBackup | undefined {
  if (!door.manualDimensions) return undefined;
  return {
    width: door.width,
    height: door.height,
    posX: door.posX,
    posY: door.posY,
    verticalAdjustOrigin: door.verticalAdjustOrigin,
    manualDimensions: true,
  };
}

export function restoreDoorManualDimensions(
  door: DoorLayerItem,
  backup: DoorManualDimensionBackup | undefined
): DoorLayerItem {
  if (!backup?.manualDimensions) return door;
  return {
    ...door,
    width: backup.width ?? door.width,
    height: backup.height ?? door.height,
    posX: backup.posX ?? door.posX,
    posY: backup.posY ?? door.posY,
    verticalAdjustOrigin: backup.verticalAdjustOrigin ?? door.verticalAdjustOrigin,
    manualDimensions: true,
  };
}
