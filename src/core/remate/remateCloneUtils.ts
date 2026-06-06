import type { RemateMountSlot, RematePiece } from "./rematePieceTypes";
import { applyProductPatch, deriveLegacyTipo, inferProductTypeFromLegacy } from "./remateProductRules";
import { createRemateId } from "./rematePieceFactory";

export const OPPOSITE_MOUNT_SLOT: Partial<Record<RemateMountSlot, RemateMountSlot>> = {
  ESQ: "DIR",
  DIR: "ESQ",
  CIMA: "FUNDO",
  FUNDO: "CIMA",
  FRENTE: "TRAS",
  TRAS: "FRENTE",
};

export function duplicateRematePiece(source: RematePiece, offsetMm = 30): RematePiece {
  const newId = createRemateId();
  return {
    ...source,
    id: newId,
    name: `${source.name} (cópia)`,
    placementMode: "FREE",
    parentGroupId: undefined,
    faceOffsets: source.faceOffsets
      ? { ...source.faceOffsets, offsetTangentUMm: (source.faceOffsets.offsetTangentUMm ?? 0) + offsetMm }
      : { offsetAlongNormalMm: 0, offsetTangentUMm: offsetMm, offsetTangentVMm: 0 },
    position: {
      xMm: source.position.xMm + offsetMm,
      yMm: source.position.yMm,
      zMm: source.position.zMm,
    },
  };
}

export function createOppositeRematePiece(source: RematePiece): RematePiece | null {
  const currentSlot = source.mountSlot ?? "FRENTE";
  const oppositeSlot = OPPOSITE_MOUNT_SLOT[currentSlot];
  if (!oppositeSlot) return null;

  const productType = source.productType ?? inferProductTypeFromLegacy(source);
  const patched = applyProductPatch(source, {
    mountSlot: oppositeSlot,
    tipo: deriveLegacyTipo(productType, oppositeSlot),
    placementMode: source.followBox && source.placementMode !== "FREE" ? "SNAPPED" : "FREE",
  });

  return {
    ...patched,
    id: createRemateId(),
    name: `${source.name} (oposto)`,
    parentGroupId: undefined,
  };
}
