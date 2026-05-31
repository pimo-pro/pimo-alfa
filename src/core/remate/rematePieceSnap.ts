import type { WorkspaceBox } from "../types";
import type { RematePiece, RematePiecePosition, RematePieceRotation, RematePieceTipo } from "./rematePieceTypes";
import { getRemateEnvelopeBoundsM, type StructuralBoundsM } from "./rematePlacement";
import type { RemateBoxMeta } from "./remateDimensions";

export type RemateSnapContext = {
  widthM: number;
  heightM: number;
  depthM: number;
  box?: RemateBoxMeta;
};

export function computeRematePieceSnapLocal(
  piece: RematePiece,
  bounds: StructuralBoundsM
): { position: RematePiecePosition; rotation: RematePieceRotation } {
  const w = piece.width / 1000;
  const h = piece.height / 1000;
  const d = piece.depth / 1000;
  const zeroRot: RematePieceRotation = { xRad: 0, yRad: 0, zRad: 0 };
  const cx = bounds.centerX;
  const cy = bounds.centerY;
  const cz = bounds.centerZ;

  const byTipo: Record<RematePieceTipo, RematePiecePosition> = {
    DIR: { xMm: (bounds.maxX + w / 2) * 1000, yMm: cy * 1000, zMm: cz * 1000 },
    ESQ: { xMm: (bounds.minX - w / 2) * 1000, yMm: cy * 1000, zMm: cz * 1000 },
    CIMA: { xMm: cx * 1000, yMm: (bounds.maxY + h / 2) * 1000, zMm: cz * 1000 },
    BAIXO: { xMm: cx * 1000, yMm: (bounds.minY - h / 2) * 1000, zMm: cz * 1000 },
    RODAPE: {
      xMm: cx * 1000,
      yMm: (bounds.minY - h / 2 - 0.002) * 1000,
      zMm: (bounds.maxZ + d / 2) * 1000,
    },
    L:
      piece.partIndex === 2
        ? {
            xMm: (bounds.maxX - w / 2) * 1000,
            yMm: (bounds.minY + h / 2) * 1000,
            zMm: (bounds.maxZ + d / 2) * 1000,
          }
        : {
            xMm: (bounds.maxX + w / 2) * 1000,
            yMm: cy * 1000,
            zMm: (bounds.maxZ - d / 2) * 1000,
          },
    RODAPE_L:
      piece.partIndex === 2
        ? {
            xMm: (bounds.maxX - w / 2) * 1000,
            yMm: (bounds.minY - h / 2) * 1000,
            zMm: (bounds.maxZ + d / 2) * 1000,
          }
        : {
            xMm: (bounds.minX + w / 2) * 1000,
            yMm: (bounds.minY - h / 2) * 1000,
            zMm: cz * 1000,
          },
  };

  return { position: byTipo[piece.tipo], rotation: zeroRot };
}

export function computeRematePieceSnapForBox(
  piece: RematePiece,
  ctx: RemateSnapContext
): { position: RematePiecePosition; rotation: RematePieceRotation } {
  const bounds = getRemateEnvelopeBoundsM(ctx.widthM, ctx.heightM, ctx.depthM, ctx.box ?? null);
  return computeRematePieceSnapLocal(piece, bounds);
}

export function defaultDimensionsForTipo(
  box: WorkspaceBox | null,
  tipo: RematePieceTipo,
  thicknessMm: number,
  partIndex?: 1 | 2
): Pick<RematePiece, "width" | "height" | "depth"> {
  const largura = Math.max(1, box?.dimensoes?.largura ?? 600);
  const altura = Math.max(1, box?.dimensoes?.altura ?? 720);
  const profundidade = Math.max(1, box?.dimensoes?.profundidade ?? 600);
  const avistaDepth = Math.min(100, profundidade + 40);
  const spanHeight = altura + 40;

  switch (tipo) {
    case "DIR":
    case "ESQ":
      return { width: thicknessMm, height: spanHeight, depth: avistaDepth };
    case "CIMA":
    case "BAIXO":
      return { width: largura, height: thicknessMm, depth: avistaDepth };
    case "RODAPE":
      return { width: largura, height: 150, depth: thicknessMm };
    case "L":
      if (partIndex === 2) {
        return { width: largura, height: thicknessMm, depth: avistaDepth };
      }
      return { width: thicknessMm, height: spanHeight, depth: avistaDepth };
    case "RODAPE_L":
      if (partIndex === 2) {
        return { width: largura, height: thicknessMm, depth: avistaDepth };
      }
      return { width: largura, height: 150, depth: thicknessMm };
    default:
      return { width: thicknessMm, height: altura, depth: avistaDepth };
  }
}
