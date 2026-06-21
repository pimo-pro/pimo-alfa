/**
 * Etapa 2 — Conversão de referenciais de coordenadas.
 *
 * Responsabilidades planeadas:
 * - solver-usable (BL, área interna) ↔ physical (BL + margem)
 * - physical BL ↔ V3 canvas (TL)
 * - Round-trip sem drift para export TCN V3 (regressão byte-a-byte)
 *
 * Não altera normalizeSheetToTopRightOrigin / computeTcnReadyHoles.
 */

import type { CutPlacement } from "../cutLayoutTypes";
import type { V3Placement } from "../../../nesting-v3/nestingV3Types";

/** @planned Etapa 2 */
export type LayoutCoordinateFrame = "solver-usable" | "physical-bottom-left" | "v3-canvas-top-left";

/** @planned Etapa 2 */
export function cutPlacementToV3Placement(_pl: CutPlacement, _sheetHeightMm: number): V3Placement {
  throw new Error("layoutCoordinateAdapter.cutPlacementToV3Placement: not implemented (Etapa 2)");
}

/** @planned Etapa 2 */
export function v3PlacementToCutPlacement(_pl: V3Placement, _sheetHeightMm: number): Pick<CutPlacement, "x_mm" | "y_mm"> {
  throw new Error("layoutCoordinateAdapter.v3PlacementToCutPlacement: not implemented (Etapa 2)");
}
