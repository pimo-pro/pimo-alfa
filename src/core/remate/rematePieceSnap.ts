import type { WorkspaceBox } from "../types";
import type { RematePiece, RematePiecePosition, RematePieceRotation, RematePieceTipo } from "./rematePieceTypes";
import { getRemateEnvelopeBoundsM, type StructuralBoundsM } from "./rematePlacement";
import type { RemateBoxMeta } from "./remateDimensions";
import { resolveRematePoseLocal, snapToMountRule } from "./remateMountFrame";
import {
  computeDimensionsForProduct,
  defaultMountSlotForProduct,
  inferProductTypeFromLegacy,
} from "./remateProductRules";

export type RemateSnapContext = {
  widthM: number;
  heightM: number;
  depthM: number;
  box?: RemateBoxMeta;
};

/** @deprecated Preferir snapToMountRule / resolveRematePoseLocal. Mantido para compat. */
export function computeRematePieceSnapLocal(
  piece: RematePiece,
  bounds: StructuralBoundsM
): { position: RematePiecePosition; rotation: RematePieceRotation } {
  const snapped = snapToMountRule(piece, bounds);
  return { position: snapped.position, rotation: snapped.rotation };
}

export function computeRematePieceSnapForBox(
  piece: RematePiece,
  ctx: RemateSnapContext
): { position: RematePiecePosition; rotation: RematePieceRotation } {
  const bounds = getRemateEnvelopeBoundsM(ctx.widthM, ctx.heightM, ctx.depthM, ctx.box ?? null);
  const resolved =
    piece.placementMode === "FREE" ? piece : snapToMountRule(piece, bounds);
  return resolveRematePoseLocal(resolved, bounds);
}

export function defaultDimensionsForTipo(
  box: WorkspaceBox | null,
  tipo: RematePieceTipo,
  thicknessMm: number,
  partIndex?: 1 | 2
): Pick<RematePiece, "width" | "height" | "depth"> {
  const productType = inferProductTypeFromLegacy({ tipo } as RematePiece);
  return computeDimensionsForProduct({
    box,
    productType,
    mountSlot: defaultMountSlotForProduct(productType),
    thicknessMm,
    partIndex,
  });
}
