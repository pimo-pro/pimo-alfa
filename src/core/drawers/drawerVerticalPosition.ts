/**
 * Posicionamento vertical unificado das gavetas (FASE 5 + folgas industriais).
 * Fonte única para DrawerGroup, useLayerActions e Viewer.
 */

import { DRAWER_VERTICAL_GAP_MM } from "./drawerGeometryConstants";

export { DRAWER_VERTICAL_GAP_MM };

export const DRAWER_VERTICAL_BASE_OFFSET_MM = 10;

export function getDrawerUsableInternalHeightMm(boxInternalHeightMm: number): number {
  return Math.max(1, boxInternalHeightMm - DRAWER_VERTICAL_BASE_OFFSET_MM);
}

/**
 * Centro Y da gaveta no sistema local do módulo (mm, origem no centro do box).
 */
export function resolveDrawerVerticalPosition(
  drawerIndex: number,
  drawerHeights: number[],
  boxInternalHeightMm: number,
  baseOffsetMm: number = DRAWER_VERTICAL_BASE_OFFSET_MM
): number {
  let offsetY = 0;
  for (let i = 0; i < drawerIndex; i++) {
    offsetY += Number.isFinite(drawerHeights[i]) ? drawerHeights[i]! : 0;
    offsetY += DRAWER_VERTICAL_GAP_MM;
  }
  const height = drawerHeights[drawerIndex] ?? 0;
  return -boxInternalHeightMm / 2 + baseOffsetMm + offsetY + height / 2;
}

export function resolveDrawerVerticalPositions(
  drawerHeights: number[],
  boxInternalHeightMm: number,
  baseOffsetMm: number = DRAWER_VERTICAL_BASE_OFFSET_MM
): number[] {
  return drawerHeights.map((_, index) =>
    resolveDrawerVerticalPosition(index, drawerHeights, boxInternalHeightMm, baseOffsetMm)
  );
}
