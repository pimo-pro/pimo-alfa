/**
 * Posiùùo da gaveta no stack vertical do mùdulo (SSOT industrial).
 *
 * Ordem fùsica: ùndice 0 = inferior (perto da base); ùltimo = superior (perto da CIMA).
 * Com `DRAWER_VERTICAL_BASE_OFFSET_MM = 0`:
 * - frente inferior chega ù borda inferior do vùo
 * - frente superior chega ù borda superior (CIMA)
 */

import {
  DRAWER_VERTICAL_BASE_OFFSET_MM,
  DRAWER_VERTICAL_GAP_MM,
} from "./drawerVerticalPosition";
import { DRAWER_LOWEST_BODY_ABOVE_MODULE_BASE_MM } from "./drawerGeometryConstants";

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
 * ElevaÁ„o do corpo vs base da frente (mm) para a gaveta inferior / ˙nica.
 * Com `frontBottom=0` ? `drawerBodyBottom = 18.5` acima da base do mÛdulo.
 */
export function resolveLowestDrawerBodyElevationFromFrontMm(): number {
  return DRAWER_LOWEST_BODY_ABOVE_MODULE_BASE_MM;
}

/** Base do corpo relativamente ‡ base do mÛdulo (mm). */
export function resolveDrawerBodyBottomFromModuleBaseMm(params: {
  frontBottomFromModuleBaseMm: number;
  sideBaseElevationMm: number;
}): number {
  return params.frontBottomFromModuleBaseMm + params.sideBaseElevationMm;
}

export type DrawerFrontStackGeometry = {
  role: DrawerStackRole;
  /** Altura da frente (mm) ù igual ao slot atribuùdo em calculateDrawerHeights. */
  frontHeightMm: number;
  /** Distùncia da base da frente ao piso interno do vùo (mm). */
  frontBottomFromModuleBaseMm: number;
  /** Distùncia do topo da frente ao piso interno (mm). */
  frontTopFromModuleBaseMm: number;
  /** Centro Y local (origem = centro do mùdulo). */
  posYMm: number;
  /** Confirma flush ù base (inferior / ùnica). */
  flushToModuleBase: boolean;
  /** Confirma flush ù CIMA (superior / ùnica). */
  flushToModuleTop: boolean;
};

/**
 * Geometria absoluta da frente no vùo interno do mùdulo.
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
  const base =
    params.baseOffsetMm != null && Number.isFinite(params.baseOffsetMm)
      ? params.baseOffsetMm
      : DRAWER_VERTICAL_BASE_OFFSET_MM;
  const heights = params.drawerHeights;
  const i = Math.max(0, Math.min(heights.length - 1, params.drawerIndex0Based));
  const frontHeightMm = Math.max(1, Number(heights[i]) || 1);
  const role = resolveDrawerStackRole(i, heights.length);

  let offsetY = 0;
  for (let k = 0; k < i; k++) {
    offsetY += Number.isFinite(heights[k]) ? heights[k]! : 0;
    offsetY += DRAWER_VERTICAL_GAP_MM;
  }
  const frontBottomFromModuleBaseMm = base + offsetY;
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
