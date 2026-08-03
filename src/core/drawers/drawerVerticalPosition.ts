/**
 * Posicionamento vertical unificado das gavetas (FASE 5 + folgas industriais).
 * Fonte única para DrawerGroup, useLayerActions e Viewer.
 *
 * Stack de frentes: flush à base do vão e flush à CIMA (2 gavetas / equal clássico).
 * 3 gavetas equal/progressive: bases SolidWorks (slides = bottom+41).
 * Folga vertical apenas ENTRE frentes consecutivas (`DRAWER_VERTICAL_GAP_MM`).
 */

import {
  DRAWER_LOWEST_FRONT_BOTTOM_FROM_MODULE_BASE_MM,
  DRAWER_VERTICAL_GAP_MM,
} from "./drawerGeometryConstants";
import {
  isSolidWorksThreeDrawerEqualStack,
  resolveSolidWorksThreeDrawerFrontBottomsMm,
} from "./drawerSolidWorksStackGeometry";

export { DRAWER_VERTICAL_GAP_MM };

/**
 * Offset da 1ª frente relativamente à base do módulo (mm).
 * SSOT = `DRAWER_LOWEST_FRONT_BOTTOM_FROM_MODULE_BASE_MM` (0 = flush).
 */
export const DRAWER_VERTICAL_BASE_OFFSET_MM = DRAWER_LOWEST_FRONT_BOTTOM_FROM_MODULE_BASE_MM;

export function getDrawerUsableInternalHeightMm(boxInternalHeightMm: number): number {
  return Math.max(1, boxInternalHeightMm - DRAWER_VERTICAL_BASE_OFFSET_MM);
}

/**
 * Centro Y da gaveta no sistema local do módulo (mm, origem no centro do box).
 * Índice 0 = gaveta inferior; último = gaveta superior.
 */
export function resolveDrawerVerticalPosition(
  drawerIndex: number,
  drawerHeights: number[],
  boxInternalHeightMm: number,
  baseOffsetMm: number = DRAWER_VERTICAL_BASE_OFFSET_MM,
  frontBottomFromBaseMm?: number
): number {
  const height = drawerHeights[drawerIndex] ?? 0;
  if (frontBottomFromBaseMm != null && Number.isFinite(frontBottomFromBaseMm)) {
    return -boxInternalHeightMm / 2 + frontBottomFromBaseMm + height / 2;
  }
  let offsetY = 0;
  for (let i = 0; i < drawerIndex; i++) {
    offsetY += Number.isFinite(drawerHeights[i]) ? drawerHeights[i]! : 0;
    offsetY += DRAWER_VERTICAL_GAP_MM;
  }
  return -boxInternalHeightMm / 2 + baseOffsetMm + offsetY + height / 2;
}

export function resolveDrawerVerticalPositions(
  drawerHeights: number[],
  boxInternalHeightMm: number,
  baseOffsetMm: number = DRAWER_VERTICAL_BASE_OFFSET_MM,
  options?: { topPanelThicknessMm?: number }
): number[] {
  const n = drawerHeights.length;
  const T = options?.topPanelThicknessMm;
  const useSw =
    n === 3 &&
    T != null &&
    Number.isFinite(T) &&
    T >= 0 &&
    isSolidWorksThreeDrawerEqualStack(3, "equal");

  const bottoms = useSw
    ? resolveSolidWorksThreeDrawerFrontBottomsMm(boxInternalHeightMm, T!)
    : null;

  return drawerHeights.map((_, index) =>
    resolveDrawerVerticalPosition(
      index,
      drawerHeights,
      boxInternalHeightMm,
      baseOffsetMm,
      bottoms ? bottoms[index] : undefined
    )
  );
}
