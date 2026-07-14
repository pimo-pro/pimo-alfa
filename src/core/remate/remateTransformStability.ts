import type { FinishTransform } from "../kitchenFinish/finishTypes";
import type {
  RematePiece,
  RematePiecePosition,
  RematePieceRotation,
} from "./rematePieceTypes";
import { isCorruptedMountOffsetSnap, isLegacyCenterZSnap } from "./remateMountFrame";

export function remateTransformFromPiece(piece: RematePiece): FinishTransform | undefined {
  if (piece.transform) return piece.transform;
  if (!piece.position) return undefined;
  return {
    xMm: piece.position.xMm,
    yMm: piece.position.yMm,
    zMm: piece.position.zMm,
    rotacaoXRad: piece.rotation?.xRad ?? 0,
    rotacaoYRad: piece.rotation?.yRad ?? 0,
    rotacaoZRad: piece.rotation?.zRad ?? 0,
  };
}

export function hasValidRemateFaceOffsets(piece: RematePiece): boolean {
  return (
    !!piece.faceOffsets &&
    !isCorruptedMountOffsetSnap(piece) &&
    !isLegacyCenterZSnap(piece)
  );
}

/** Transform guardado — posição/rotação/offsets não devem ser recalculados a partir da caixa. */
export function hasSavedRemateTransform(piece: RematePiece): boolean {
  if (piece.isInitialPlacement === true) return false;
  if (piece.placementMode === "FREE") return true;
  if (hasValidRemateFaceOffsets(piece)) return true;
  if (piece.isInitialPlacement === false) return true;
  const t = remateTransformFromPiece(piece);
  if (!t) return false;
  return (
    Math.abs(t.xMm ?? 0) > 0.01 ||
    Math.abs(t.yMm ?? 0) > 0.01 ||
    Math.abs(t.zMm ?? 0) > 0.01
  );
}

/** Só na criação inicial (antes de settle). */
export function shouldResolveRematePoseFromBounds(piece: RematePiece): boolean {
  return piece.isInitialPlacement === true && !hasSavedRemateTransform(piece);
}

export function getRemateSavedPoseLocal(piece: RematePiece): {
  position: RematePiecePosition;
  rotation: RematePieceRotation;
} {
  const t = piece.transform ?? remateTransformFromPiece(piece);
  if (t?.xMm != null && t.yMm != null && t.zMm != null) {
    return {
      position: { xMm: t.xMm, yMm: t.yMm, zMm: t.zMm },
      rotation: {
        xRad: t.rotacaoXRad ?? piece.rotation.xRad,
        yRad: t.rotacaoYRad ?? piece.rotation.yRad,
        zRad: t.rotacaoZRad ?? piece.rotation.zRad,
      },
    };
  }
  return { position: piece.position, rotation: piece.rotation };
}

export function markRematePlacementSettled(piece: RematePiece): RematePiece {
  const transform = remateTransformFromPiece(piece);
  return {
    ...piece,
    isInitialPlacement: false,
    ...(transform ? { transform } : {}),
  };
}

export function shouldSkipRemateUpgradeSnap(piece: RematePiece): boolean {
  if (piece.placementMode === "FREE" || !piece.followBox) return true;
  if (hasSavedRemateTransform(piece)) return true;
  return false;
}

export function stabilizeRemateForPersistence(piece: RematePiece): RematePiece {
  return markRematePlacementSettled(piece);
}
