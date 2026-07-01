import type { RematePiece } from "./rematePieceTypes";
import { isLRematePiece } from "./remateLGeometry";
import { resolveMountSlot } from "./remateMountFrame";

/**
 * Mapeia dimensões industriais da peça (width=comprimento, height=largura, depth=espessura)
 * para os extents do BoxGeometry no espaço local antes da pose de montagem.
 */
export function remateGeometryExtentsM(piece: Pick<RematePiece, "width" | "height" | "depth" | "mountSlot" | "tipo">): {
  w: number;
  h: number;
  d: number;
} {
  const comprimento = Math.max(0.001, piece.width / 1000);
  const largura = Math.max(0.001, piece.height / 1000);
  const espessura = Math.max(0.001, piece.depth / 1000);

  if (isLRematePiece(piece as RematePiece)) {
    return { w: comprimento, h: largura, d: espessura };
  }

  const slot = resolveMountSlot(piece as RematePiece);

  switch (slot) {
    case "DIR":
    case "ESQ":
      return { w: espessura, h: comprimento, d: largura };
    case "CIMA":
    case "FUNDO":
      // height=largura (extensão na face), depth=espessura (espessura material / avista)
      return { w: comprimento, h: largura, d: espessura };
    case "FRENTE":
    case "TRAS":
    default:
      return { w: comprimento, h: largura, d: espessura };
  }
}
