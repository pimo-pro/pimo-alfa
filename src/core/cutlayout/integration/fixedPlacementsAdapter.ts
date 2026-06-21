/**
 * Etapa 3 — Placements fixos (V3 manual) → CutLayoutResult validado.
 *
 * Responsabilidades planeadas:
 * - v3StateToLayoutResult equivalente no contrato industrial
 * - validateIndustrialLayout(..., preserve-positions)
 * - finalizeIndustrialLayout(..., mode: 'preserve-positions')
 * - Sem re-nesting, sem compactação, sem pocket filling
 */

import type { CutLayoutResult } from "../cutLayoutTypes";
import type { NestingV3State } from "../../../nesting-v3/nestingV3Types";
import type { IndustrialLayoutValidateOptions } from "./industrialLayoutContract";

/** @planned Etapa 3 */
export function fixedPlacementsFromV3State(
  _state: NestingV3State,
  _validateOpts: IndustrialLayoutValidateOptions
): { result: CutLayoutResult; valid: boolean } {
  throw new Error("fixedPlacementsAdapter.fixedPlacementsFromV3State: not implemented (Etapa 3)");
}
