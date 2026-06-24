import { SYSTEM_BACK_MM, SYSTEM_THICKNESS_MM } from "../../../core/baseCabinets";
import type { InternalCavityMeasurements, BoxCavityBoundsLocal } from "../measurement/internalRulerOverlayTypes";
import type { ViewerBoxEntry } from "../types";
import { resolveNoBackPanel } from "../../../core/box/backPanelFlags";

const THICKNESS_M = SYSTEM_THICKNESS_MM / 1000;
const BACK_M = SYSTEM_BACK_MM / 1000;
const FRONT_OPEN_EPS_M = 0.002;

export function computeBoxCavityBoundsLocal(entry: ViewerBoxEntry): BoxCavityBoundsLocal {
  const depth = entry.carcassDepth ?? entry.depth;
  const halfW = entry.width * 0.5;
  const halfH = entry.height * 0.5;
  const halfD = depth * 0.5;
  const minX = -halfW + THICKNESS_M;
  const maxX = halfW - THICKNESS_M;
  const minY = -halfH + THICKNESS_M;
  const maxY = halfH - THICKNESS_M;
  const minZ = -halfD + (resolveNoBackPanel(entry) ? 0 : BACK_M);
  const maxZ = halfD - FRONT_OPEN_EPS_M;
  const sizeX = Math.max(0.001, maxX - minX);
  const sizeY = Math.max(0.001, maxY - minY);
  const sizeZ = Math.max(0.001, maxZ - minZ);
  return {
    minX,
    minY,
    minZ,
    maxX,
    maxY,
    maxZ,
    centerX: (minX + maxX) * 0.5,
    centerY: (minY + maxY) * 0.5,
    centerZ: (minZ + maxZ) * 0.5,
    sizeX,
    sizeY,
    sizeZ,
  };
}

export function cavityBoundsToMeasurementsMm(boxId: string, bounds: BoxCavityBoundsLocal): InternalCavityMeasurements {
  const toMm = (m: number) => Math.round(m * 10000) / 10;
  return {
    boxId,
    widthMm: toMm(bounds.sizeX),
    heightMm: toMm(bounds.sizeY),
    depthMm: toMm(bounds.sizeZ),
  };
}

export function computeInternalCavityMeasurements(
  boxId: string,
  entry: ViewerBoxEntry
): InternalCavityMeasurements {
  return cavityBoundsToMeasurementsMm(boxId, computeBoxCavityBoundsLocal(entry));
}

export function isPointInsideCavityLocal(entry: ViewerBoxEntry, local: { x: number; y: number; z: number }): boolean {
  const bounds = computeBoxCavityBoundsLocal(entry);
  const eps = 0.0005;
  return (
    local.x >= bounds.minX - eps &&
    local.x <= bounds.maxX + eps &&
    local.y >= bounds.minY - eps &&
    local.y <= bounds.maxY + eps &&
    local.z >= bounds.minZ - eps &&
    local.z <= bounds.maxZ + eps
  );
}

export function getCavityCenterLocal(entry: ViewerBoxEntry): { x: number; y: number; z: number } {
  const b = computeBoxCavityBoundsLocal(entry);
  return { x: b.centerX, y: b.centerY, z: b.centerZ };
}
