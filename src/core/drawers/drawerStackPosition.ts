/**
 * Posi��o da gaveta no stack vertical do m�dulo (SSOT industrial).
 *
 * Ordem f�sica: �ndice 0 = inferior (perto da base); �ltimo = superior (perto da CIMA).
 * Com `DRAWER_VERTICAL_BASE_OFFSET_MM = 0`:
 * - frente inferior chega � borda inferior do v�o
 * - frente superior chega � borda superior (CIMA)
 */

import {
  DRAWER_HIGHEST_BODY_ELEVATION_FROM_FRONT_MM,
  DRAWER_LOWEST_BODY_ABOVE_MODULE_BASE_MM,
  DRAWER_SIDE_BASE_ELEVATION_MM,
} from "./drawerGeometryConstants";

export type DrawerStackRole = "lowest" | "highest" | "middle" | "single";

export function resolveDrawerStackRole(
  drawerIndex0Based: number,
  drawerCount: number
): DrawerStackRole {
  const n = Math.max(0, Math.floor(drawerCount));
  const i = Math.max(0, Math.floor(drawerIndex0Based));
  if (n <= 1) return "single";
  if (i <= 0) return "lowest";
  if (i >= n - 1) return "highest";
  return "middle";
}

/**
 * Elevação do corpo vs base da frente (mm) para a gaveta inferior / única.
 * Com `frontBottom=0` → `drawerBodyBottom = 18,5` acima da base do módulo.
 */
export function resolveLowestDrawerBodyElevationFromFrontMm(): number {
  return DRAWER_LOWEST_BODY_ABOVE_MODULE_BASE_MM;
}

/**
 * Elevação industrial do corpo vs frente por papel no stack.
 * lowest/single: 18,5 · middle: 17 · highest: 12,5 (folga CIMA ≥33 mm).
 */
export function resolveDrawerBodyElevationForStackRoleMm(
  stackRole: DrawerStackRole
): number {
  switch (stackRole) {
    case "lowest":
    case "single":
      return DRAWER_LOWEST_BODY_ABOVE_MODULE_BASE_MM;
    case "highest":
      return DRAWER_HIGHEST_BODY_ELEVATION_FROM_FRONT_MM;
    case "middle":
    default:
      return DRAWER_SIDE_BASE_ELEVATION_MM;
  }
}

/** Base do corpo relativamente � base do m�dulo (mm). */
export function resolveDrawerBodyBottomFromModuleBaseMm(params: {
  frontBottomFromModuleBaseMm: number;
  sideBaseElevationMm: number;
}): number {
  return params.frontBottomFromModuleBaseMm + params.sideBaseElevationMm;
}

export type DrawerFrontStackGeometry = {
  role: DrawerStackRole;
  /** Altura da frente (mm) � igual ao slot atribu�do em calculateDrawerHeights. */
  frontHeightMm: number;
  /** Dist�ncia da base da frente ao piso interno do v�o (mm). */
  frontBottomFromModuleBaseMm: number;
  /** Dist�ncia do topo da frente ao piso interno (mm). */
  frontTopFromModuleBaseMm: number;
  /** Centro Y local (origem = centro do m�dulo). */
  posYMm: number;
  /** Confirma flush � base (inferior / �nica). */
  flushToModuleBase: boolean;
  /** Confirma flush � CIMA (superior / �nica). */
  flushToModuleTop: boolean;
};

/**
 * Geometria absoluta da frente no v�o interno do m�dulo.
 * `drawerHeights` na mesma ordem que `calculateDrawerHeights` / `resolveDrawerVerticalPositions`.
 */
export function resolveDrawerFrontStackGeometry(params: {
  drawerIndex0Based: number;
  drawerHeights: number[];
  boxInternalHeightMm: number;
  baseOffsetMm?: number;
  posYMm: number;
}): DrawerFrontStackGeometry {
  const boxH = Math.max(1, Number(params.boxInternalHeightMm) || 1);
  const heights = params.drawerHeights;
  const i = Math.max(0, Math.min(heights.length - 1, params.drawerIndex0Based));
  const frontHeightMm = Math.max(1, Number(heights[i]) || 1);
  const role = resolveDrawerStackRole(i, heights.length);

  // Bottom a partir de posY (SSOT) — cobre stack equal clássico e bottoms SolidWorks.
  const frontBottomFromModuleBaseMm =
    params.posYMm - (-boxH / 2) - frontHeightMm / 2;
  const frontTopFromModuleBaseMm = frontBottomFromModuleBaseMm + frontHeightMm;

  const eps = 0.51;
  const flushToModuleBase =
    (role === "lowest" || role === "single") && frontBottomFromModuleBaseMm <= eps;
  const flushToModuleTop =
    (role === "highest" || role === "single") &&
    Math.abs(frontTopFromModuleBaseMm - boxH) <= eps;

  return {
    role,
    frontHeightMm,
    frontBottomFromModuleBaseMm,
    frontTopFromModuleBaseMm,
    posYMm: params.posYMm,
    flushToModuleBase,
    flushToModuleTop,
  };
}
