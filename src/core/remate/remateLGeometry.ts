import type { StructuralBoundsM } from "./rematePlacement";
import type { RemateMountSlot, RematePiece } from "./rematePieceTypes";

/** Largura fixa da chapa de remate L (mm). */
export const REMATE_L_STRIP_WIDTH_MM = 100;

const L_PRIMARY_SLOTS: RemateMountSlot[] = ["DIR", "ESQ", "CIMA", "FUNDO"];

export function isLateralLSlot(slot: RemateMountSlot): boolean {
  return slot === "DIR" || slot === "ESQ";
}

/** Face perpendicular à peça A onde a peça B encosta. */
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

export function computeLRemateSheetDimensions(params: {
  primarySlot: RemateMountSlot;
  partIndex: 1 | 2;
  boxAlturaMm: number;
  boxLarguraMm: number;
  thicknessMm: number;
}): { width: number; height: number; depth: number } {
  const { primarySlot, partIndex, boxAlturaMm, boxLarguraMm, thicknessMm } = params;
  const lateral = isLateralLSlot(primarySlot);
  const comprimentoA = lateral ? boxAlturaMm : boxLarguraMm;
  const comprimentoB = lateral ? boxLarguraMm : boxAlturaMm;
  const comprimento = partIndex === 1 ? comprimentoA : comprimentoB;
  return {
    width: Math.max(1, comprimento),
    height: REMATE_L_STRIP_WIDTH_MM,
    depth: Math.max(1, thicknessMm),
  };
}

type Vec3 = { x: number; y: number; z: number };

function vec(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

/** Centro da peça no espaço local do módulo (m) — formato L real a 90°. */
export function computeLRemateCenterM(
  piece: Pick<RematePiece, "width" | "height" | "depth" | "mountSlot" | "partIndex">,
  bounds: StructuralBoundsM
): Vec3 {
  const primary = resolveLPrimarySlot(piece);
  const t = Math.max(0.001, piece.depth / 1000);
  const strip = Math.max(0.001, piece.height / 1000);
  const comprimento = Math.max(0.001, piece.width / 1000);
  const { minX, maxX, minY, maxY, maxZ, centerX, centerY } = bounds;

  if (piece.partIndex === 1) {
    switch (primary) {
      case "DIR":
        return vec(maxX + t / 2, centerY, maxZ - strip / 2);
      case "ESQ":
        return vec(minX - t / 2, centerY, maxZ - strip / 2);
      case "CIMA":
        return vec(centerX, maxY + t / 2, maxZ - strip / 2);
      case "FUNDO":
        return vec(centerX, minY - t / 2, maxZ - strip / 2);
      default:
        return vec(maxX + t / 2, centerY, maxZ - strip / 2);
    }
  }

  switch (primary) {
    case "DIR":
      return vec(maxX - comprimento / 2, minY + strip / 2, maxZ + t / 2);
    case "ESQ":
      return vec(minX + comprimento / 2, minY + strip / 2, maxZ + t / 2);
    case "CIMA":
      return vec(maxX + t / 2, maxY - comprimento / 2, maxZ - strip / 2);
    case "FUNDO":
      return vec(maxX + t / 2, minY + comprimento / 2, maxZ - strip / 2);
    default:
      return vec(maxX - comprimento / 2, minY + strip / 2, maxZ + t / 2);
  }
}

export function remateLIndustrialName(partIndex: 1 | 2, boxCode?: string): string {
  const suffix = partIndex === 1 ? "REMATE_L_A" : "REMATE_L_B";
  const code = boxCode?.trim();
  return code ? `${code}_${suffix}` : suffix;
}
