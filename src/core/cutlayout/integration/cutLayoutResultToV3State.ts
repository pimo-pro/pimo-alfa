/**
 * Etapa 2 — CutLayoutResult → NestingV3State (placements + rotações).
 *
 * Responsabilidades planeadas:
 * - Invocar layoutCoordinateAdapter para TL canvas
 * - Mapear rotacao 0/90 para V3Piece.rotation
 * - Não alterar originalHoles (pré-rotação)
 */

import type { CutLayoutResult } from "../cutLayoutTypes";
import type { NestingV3State } from "../../../nesting-v3/nestingV3Types";

/** @planned Etapa 2 */
export function cutLayoutResultToV3State(_result: CutLayoutResult, _baseState: NestingV3State): NestingV3State {
  throw new Error("cutLayoutResultToV3State: not implemented (Etapa 2)");
}
