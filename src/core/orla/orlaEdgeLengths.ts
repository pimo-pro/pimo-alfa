import type { CutListItem } from "../types";
import type { OrlaSideId } from "./orlaTypes";

/** Comprimentos (mm) de cada lado lógico por tipo de peça paramétrica. */
export function getOrlaEdgeLengthsMm(item: CutListItem): Record<OrlaSideId, number> {
  const w = Math.max(0, item.dimensoes?.largura ?? 0);
  const h = Math.max(0, item.dimensoes?.altura ?? 0);
  const d = Math.max(0, item.dimensoes?.profundidade ?? 0);
  const tipo = (item.tipo ?? item.nome ?? "").toLowerCase();
  if (tipo.includes("lateral") || tipo.includes("left") || tipo.includes("right")) {
    return { front: h, back: h, left: d, right: d };
  }
  if (tipo.includes("costa") || tipo.includes("back")) {
    return { front: h, back: h, left: w, right: w };
  }
  if (tipo.includes("prateleira") || tipo.includes("shelf")) {
    return { front: w, back: w, left: d, right: d };
  }
  return { front: w, back: w, left: d, right: d };
}
