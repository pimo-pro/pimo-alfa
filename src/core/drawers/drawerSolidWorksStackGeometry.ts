/**
 * Geometria vertical alinhada ao modelo SolidWorks (3 gavetas).
 * Slides: Y = frenteBottom + 41 (piso 41 intocado).
 * Não altera padrão X nem furação estrutural das peças da gaveta.
 */

import type { DrawerStackRole } from "./drawerStackPosition";

/** Folga: frente superior cobre CIMA e desce 2 mm abaixo da face inferior. */
export const DRAWER_TOP_FRONT_CIMA_OVERHANG_BELOW_MM = 2;

/**
 * Desconto frente?lateral (mm) — reproduz SW:
 * lowest: 258.667 ? 177.167 = 81.5; mid/top: 260.667 ? 196.167 = 64.5.
 */
export const DRAWER_LATERAL_HEIGHT_BELOW_FRONT_LOWEST_MM = 81.5;
export const DRAWER_LATERAL_HEIGHT_BELOW_FRONT_OTHER_MM = 64.5;

/**
 * Alturas de frente SW (equal, 3 gavetas) a partir de H externo e T (CIMA).
 * step = (H ? T) / 3 ? F_low = step+11, F_up = step+13
 * (762, 19) ? 258.667 / 260.667 / 260.667
 */
export function resolveSolidWorksThreeDrawerFrontHeightsMm(
  boxExternalHeightMm: number,
  topPanelThicknessMm: number
): [number, number, number] {
  const H = Math.max(1, Number(boxExternalHeightMm) || 1);
  const T = Math.max(0, Number(topPanelThicknessMm) || 0);
  const step = (H - T) / 3;
  const fLow = step + 11;
  const fUp = step + 13;
  return [fLow, fUp, fUp];
}

/**
 * Bases das frentes (desde o piso do datum) para Y_corrediça = bottom + 41.
 * (762, 19) ? 0 / 247.667 / 514.333 ? slides 41 / 288.667 / 555.333
 */
export function resolveSolidWorksThreeDrawerFrontBottomsMm(
  boxExternalHeightMm: number,
  topPanelThicknessMm: number
): [number, number, number] {
  const H = Math.max(1, Number(boxExternalHeightMm) || 1);
  const T = Math.max(0, Number(topPanelThicknessMm) || 0);
  const step = (H - T) / 3;
  return [0, step, 2 * step + T];
}

export function isSolidWorksThreeDrawerEqualStack(
  count: number,
  mode: string
): boolean {
  return count === 3 && (mode === "equal" || mode === "progressive");
}

/** Altura madeira laterais/costa por papel no stack (SSOT SW). */
export function resolveDrawerWoodBodyHeightForStackRoleMm(
  frontHeightMm: number,
  stackRole: DrawerStackRole = "middle"
): number {
  const frontH = Math.max(0, Number(frontHeightMm) || 0);
  const below =
    stackRole === "lowest" || stackRole === "single"
      ? DRAWER_LATERAL_HEIGHT_BELOW_FRONT_LOWEST_MM
      : DRAWER_LATERAL_HEIGHT_BELOW_FRONT_OTHER_MM;
  return Math.max(1, frontH - below);
}

/** Confirma overlay: frente cobre T_cima e desce ? 2 mm abaixo da face inferior da CIMA. */
export function assertTopFrontCoversCimaWithClearance(params: {
  boxExternalHeightMm: number;
  topPanelThicknessMm: number;
  clearanceBelowCimaMm?: number;
}): {
  frontTopMm: number;
  frontBottomMm: number;
  cimaUndersideMm: number;
  coverThroughCimaMm: number;
  extendsBelowUndersideMm: number;
  ok: boolean;
} {
  const H = Math.max(1, params.boxExternalHeightMm);
  const T = Math.max(0, params.topPanelThicknessMm);
  const clearance = params.clearanceBelowCimaMm ?? DRAWER_TOP_FRONT_CIMA_OVERHANG_BELOW_MM;
  const bottoms = resolveSolidWorksThreeDrawerFrontBottomsMm(H, T);
  const heights = resolveSolidWorksThreeDrawerFrontHeightsMm(H, T);
  const frontBottomMm = bottoms[2];
  const frontTopMm = frontBottomMm + heights[2];
  const cimaUndersideMm = H - T;
  const coverThroughCimaMm = frontTopMm - cimaUndersideMm;
  const extendsBelowUndersideMm = cimaUndersideMm - frontBottomMm;
  const ok =
    frontTopMm + 1e-6 >= H && frontBottomMm <= cimaUndersideMm - clearance + 1e-6;
  return {
    frontTopMm,
    frontBottomMm,
    cimaUndersideMm,
    coverThroughCimaMm,
    extendsBelowUndersideMm,
    ok,
  };
}
