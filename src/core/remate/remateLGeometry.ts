import type { StructuralBoundsM } from "./rematePlacement";
import type { RemateMountSlot, RematePiece, RematePiecePosition, RematePieceRotation } from "./rematePieceTypes";

/** Largura fixa da chapa de remate L (mm) — faixa visível. */
export const REMATE_L_STRIP_WIDTH_MM = 100;

const L_PRIMARY_SLOTS: RemateMountSlot[] = ["DIR", "ESQ", "CIMA", "FUNDO"];

const ZERO_ROT: RematePieceRotation = { xRad: 0, yRad: 0, zRad: 0 };

/** Rotação da peça int CIMA: faixa de 100 mm deitada em Z (L real visto de lado). */
export const REMATE_L_CIMA_INT_ROTATION: RematePieceRotation = {
  xRad: Math.PI / 2,
  yRad: 0,
  zRad: 0,
};

export function resolveLRemateRotation(piece: RematePiece): RematePieceRotation {
  if (isLRemateInt(piece) && resolveLPrimarySlot(piece) === "CIMA") {
    return REMATE_L_CIMA_INT_ROTATION;
  }
  return ZERO_ROT;
}

export function isLRematePiece(piece: Pick<RematePiece, "productType" | "tipo">): boolean {
  return piece.productType === "L" || piece.tipo === "L";
}

export function isLRemateExt(piece: Pick<RematePiece, "partIndex" | "productType" | "tipo">): boolean {
  return isLRematePiece(piece) && piece.partIndex !== 2;
}

export function isLRemateInt(piece: Pick<RematePiece, "partIndex" | "productType" | "tipo">): boolean {
  return isLRematePiece(piece) && piece.partIndex === 2;
}

export function isLateralLSlot(slot: RemateMountSlot): boolean {
  return slot === "DIR" || slot === "ESQ";
}

/** Face perpendicular à peça ext onde a peça int encosta. */
export function lSecondaryMountSlot(primary: RemateMountSlot): RemateMountSlot {
  switch (primary) {
    case "DIR":
    case "ESQ":
      return "FRENTE";
    case "CIMA":
    case "FUNDO":
      return "DIR";
    default:
      return "FRENTE";
  }
}

export function resolveLPrimarySlot(piece: Pick<RematePiece, "mountSlot" | "partIndex">): RemateMountSlot {
  if (piece.partIndex === 2 && piece.mountSlot) {
    for (const primary of L_PRIMARY_SLOTS) {
      if (lSecondaryMountSlot(primary) === piece.mountSlot) return primary;
    }
  }
  if (piece.mountSlot && L_PRIMARY_SLOTS.includes(piece.mountSlot)) {
    return piece.mountSlot;
  }
  return "DIR";
}

/**
 * Dimensões khaled-pro por peça (largura × altura × profundidade).
 * CIMA: largura=comprimento, altura=faixa, profundidade=espessura.
 * Laterais (DIR/ESQ legacy): ext=faixa×altura, int=largura×faixa.
 */
export function computeLRemateSheetDimensions(params: {
  primarySlot: RemateMountSlot;
  partIndex: 1 | 2;
  boxAlturaMm: number;
  boxLarguraMm: number;
  thicknessMm: number;
  boxPanelThicknessMm?: number;
}): { width: number; height: number; depth: number } {
  const { primarySlot, partIndex, boxAlturaMm, boxLarguraMm, thicknessMm } = params;
  const esp = Math.max(1, thicknessMm);
  const faixa = REMATE_L_STRIP_WIDTH_MM;

  if (primarySlot === "CIMA") {
    return {
      width: Math.max(1, boxLarguraMm),
      height: faixa,
      depth: esp,
    };
  }

  const lateral = isLateralLSlot(primarySlot);
  const comprimentoExt = lateral ? boxAlturaMm : boxLarguraMm;
  const comprimentoInt = lateral ? boxLarguraMm : boxAlturaMm;

  if (partIndex === 1) {
    return {
      width: faixa,
      height: Math.max(1, comprimentoExt),
      depth: esp,
    };
  }
  return {
    width: Math.max(1, comprimentoInt),
    height: faixa,
    depth: esp,
  };
}

/** Origem = canto inferior-esquerdo-frontal (minX, minY, maxZ da AABB). */
export function lRemateCornerToCenterMm(
  piece: Pick<RematePiece, "width" | "height" | "depth">,
  corner: RematePiecePosition
): RematePiecePosition {
  return {
    xMm: corner.xMm + piece.width / 2,
    yMm: corner.yMm + piece.height / 2,
    zMm: corner.zMm - piece.depth / 2,
  };
}

function lRemateCornerToCenterCimaFrame(
  piece: RematePiece,
  corner: RematePiecePosition
): RematePiecePosition {
  if (isLRemateInt(piece)) {
    return {
      xMm: corner.xMm + piece.width / 2,
      yMm: corner.yMm + piece.depth / 2,
      zMm: corner.zMm - piece.height / 2,
    };
  }
  return lRemateCornerToCenterMm(piece, corner);
}

function lRemateCenterToCornerCimaFrame(
  piece: RematePiece,
  center: RematePiecePosition
): RematePiecePosition {
  if (isLRemateInt(piece)) {
    return {
      xMm: center.xMm - piece.width / 2,
      yMm: center.yMm - piece.depth / 2,
      zMm: center.zMm + piece.height / 2,
    };
  }
  return lRemateCenterToCornerMm(piece, center);
}

function lRemateCornerToCenterForPiece(piece: RematePiece, corner: RematePiecePosition): RematePiecePosition {
  if (resolveLPrimarySlot(piece) === "CIMA") {
    return lRemateCornerToCenterCimaFrame(piece, corner);
  }
  return lRemateCornerToCenterMm(piece, corner);
}

function lRemateCenterToCornerForPiece(piece: RematePiece, center: RematePiecePosition): RematePiecePosition {
  if (resolveLPrimarySlot(piece) === "CIMA") {
    return lRemateCenterToCornerCimaFrame(piece, center);
  }
  return lRemateCenterToCornerMm(piece, center);
}

export function lRemateCenterToCornerMm(
  piece: Pick<RematePiece, "width" | "height" | "depth">,
  center: RematePiecePosition
): RematePiecePosition {
  return {
    xMm: center.xMm - piece.width / 2,
    yMm: center.yMm - piece.height / 2,
    zMm: center.zMm + piece.depth / 2,
  };
}

/** Posição de canto inicial da peça ext (rem_L_ext) encostada ao módulo. */
export function computeLRemateExtCornerMm(
  primary: RemateMountSlot,
  extDims: Pick<RematePiece, "width" | "height" | "depth">,
  bounds: StructuralBoundsM
): RematePiecePosition {
  const w = extDims.width;
  const h = extDims.height;
  const d = extDims.depth;
  const minY = bounds.minY * 1000;
  const maxZ = bounds.maxZ * 1000;

  switch (primary) {
    case "DIR":
      return { xMm: bounds.maxX * 1000, yMm: minY, zMm: maxZ };
    case "ESQ":
      return { xMm: bounds.minX * 1000 - w, yMm: minY, zMm: maxZ };
    case "CIMA":
      return { xMm: bounds.minX * 1000, yMm: bounds.maxY * 1000, zMm: maxZ - d };
    case "FUNDO":
      return { xMm: bounds.minX * 1000, yMm: bounds.minY * 1000 - h, zMm: maxZ - d };
    default:
      return { xMm: bounds.maxX * 1000, yMm: minY, zMm: maxZ };
  }
}

/**
 * União geométrica CIMA (modelo interno): int encaixada em ext em Z, mesma X/Y.
 * Laterais legacy (DIR/ESQ): int acima de ext em Y.
 */
export function computeLRemateIntCornerFromExt(
  extCorner: RematePiecePosition,
  extDims: Pick<RematePiece, "width" | "height" | "depth">,
  primary: RemateMountSlot = "DIR"
): RematePiecePosition {
  if (primary === "CIMA") {
    return {
      xMm: extCorner.xMm,
      yMm: extCorner.yMm,
      zMm: extCorner.zMm - extDims.depth,
    };
  }
  return {
    xMm: extCorner.xMm,
    yMm: extCorner.yMm + extDims.height,
    zMm: extCorner.zMm,
  };
}

export function computeLRemateIntCornerFromExtPiece(ext: RematePiece): RematePiecePosition {
  return computeLRemateIntCornerFromExt(ext.position, ext, resolveLPrimarySlot(ext));
}

export function computeLRemateExtCornerFromInt(
  intCorner: RematePiecePosition,
  extDims: Pick<RematePiece, "width" | "height" | "depth">,
  primary: RemateMountSlot = "DIR"
): RematePiecePosition {
  if (primary === "CIMA") {
    return {
      xMm: intCorner.xMm,
      yMm: intCorner.yMm,
      zMm: intCorner.zMm + extDims.depth,
    };
  }
  return {
    xMm: intCorner.xMm,
    yMm: intCorner.yMm - extDims.height,
    zMm: intCorner.zMm,
  };
}

/** Pose de render: centro 3D + rotação (CIMA int Rx90°). */
export function resolveLRemateRenderPose(
  piece: RematePiece,
  _bounds?: StructuralBoundsM
): { position: RematePiecePosition; rotation: RematePieceRotation } {
  const position =
    piece.placementMode === "FREE"
      ? piece.position
      : lRemateCornerToCenterForPiece(piece, piece.position);

  return {
    position,
    rotation: resolveLRemateRotation(piece),
  };
}

/** Snap inicial das duas peças L com cantos encadeados. */
export function snapLRemateGroupCorners(
  ext: RematePiece,
  int: RematePiece,
  bounds: StructuralBoundsM
): { ext: RematePiece; int: RematePiece } {
  const primary = resolveLPrimarySlot(ext);
  const extRotation = resolveLRemateRotation(ext);
  const intRotation = resolveLRemateRotation(int);
  const extCorner = computeLRemateExtCornerMm(primary, ext, bounds);
  const intCorner = computeLRemateIntCornerFromExt(extCorner, ext, primary);

  return {
    ext: {
      ...ext,
      mountSlot: primary,
      placementMode: "SNAPPED",
      faceOffsets: undefined,
      position: extCorner,
      rotation: extRotation,
    },
    int: {
      ...int,
      mountSlot: lSecondaryMountSlot(primary),
      placementMode: "SNAPPED",
      faceOffsets: undefined,
      position: intCorner,
      rotation: intRotation,
    },
  };
}

/** Ao mover/redimensionar uma peça L, mantém união perfeita no grupo. */
export function applyLRemateGroupCoupling(remates: RematePiece[], movedId: string): RematePiece[] {
  const moved = remates.find((r) => r.id === movedId);
  if (!moved || !isLRematePiece(moved) || !moved.parentGroupId) return remates;

  const group = remates.filter((r) => r.parentGroupId === moved.parentGroupId && isLRematePiece(r));
  const ext = group.find((r) => r.partIndex === 1);
  const int = group.find((r) => r.partIndex === 2);
  if (!ext || !int) return remates;

  const primary = resolveLPrimarySlot(ext);

  if (moved.partIndex === 1) {
    const intCorner = computeLRemateIntCornerFromExtPiece(ext);
    return remates.map((r) =>
      r.id === int.id
        ? {
            ...r,
            position: intCorner,
            rotation: resolveLRemateRotation(r),
            placementMode: moved.placementMode,
          }
        : r
    );
  }

  const extCorner = computeLRemateExtCornerFromInt(int.position, ext, primary);
  return remates.map((r) =>
    r.id === ext.id
      ? {
          ...r,
          position: extCorner,
          rotation: resolveLRemateRotation(r),
          placementMode: moved.placementMode,
        }
      : r
  );
}

/** Converte patch vindo do viewer (centro) para canto khaled-pro. */
export function normalizeLRemateTransformPatch<T extends Partial<Pick<RematePiece, "position" | "rotation" | "faceOffsets" | "placementMode">>>(
  piece: RematePiece,
  patch: T,
  _bounds?: StructuralBoundsM
): T {
  if (!isLRematePiece(piece)) return patch;
  const next: T = {
    ...patch,
    rotation: resolveLRemateRotation(piece),
    faceOffsets: undefined,
    placementMode: patch.placementMode ?? "FREE",
  } as T;
  if (patch.position) {
    next.position = lRemateCenterToCornerForPiece(piece, patch.position);
  }
  return next;
}

/** @deprecated Preferir resolveLRemateRenderPose / computeLRemateExtCornerMm */
export function computeLRemateCenterM(
  piece: Pick<RematePiece, "width" | "height" | "depth" | "mountSlot" | "partIndex" | "position">,
  bounds: StructuralBoundsM
): { x: number; y: number; z: number } {
  const full = piece as RematePiece;
  const pose = resolveLRemateRenderPose(full, bounds);
  return {
    x: pose.position.xMm / 1000,
    y: pose.position.yMm / 1000,
    z: pose.position.zMm / 1000,
  };
}

export function remateLIndustrialName(partIndex: 1 | 2, boxCode?: string): string {
  const suffix = partIndex === 1 ? "REMATE_L_ext" : "REMATE_L_int";
  const code = boxCode?.trim();
  return code ? `${code}_${suffix}` : suffix;
}

export function remateLIndustrialSuffix(partIndex: 1 | 2 | undefined): "L_ext" | "L_int" {
  return partIndex === 2 ? "L_int" : "L_ext";
}

/** Observação industrial obrigatória para Remate L (ext e int, todos os slots). */
export const REMATE_L_INDUSTRIAL_OBSERVACAO = "ME manual";

export function isRemateLIndustrialMetadata(metadata?: Record<string, unknown>): boolean {
  if (!metadata) return false;
  if (metadata.productType === "L") return true;
  const kind = metadata.remateKind;
  return kind === "L_ext" || kind === "L_int";
}

export function isRemateLIndustrialPiece(
  piece: Pick<RematePiece, "productType" | "tipo">
): boolean {
  return piece.productType === "L" || piece.tipo === "L";
}
