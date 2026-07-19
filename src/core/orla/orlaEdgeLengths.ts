import type { CutListItem } from "../types";
import type { OrlaSideId } from "./orlaTypes";
import { normalizeOrlaPieceTipo } from "./orlaIndustrialRules";

/**
 * Comprimentos (mm) de cada lado logico por tipo de peca.
 * Para gavetas "so topo", o lado `front` representa a aresta superior.
 */
export function getOrlaEdgeLengthsMm(item: CutListItem): Record<OrlaSideId, number> {
  const w = Math.max(0, item.dimensoes?.largura ?? 0);
  const h = Math.max(0, item.dimensoes?.altura ?? 0);
  const d = Math.max(0, item.dimensoes?.profundidade ?? 0);
  const t = normalizeOrlaPieceTipo(item.tipo ?? item.nome ?? "");

  // Gaveta corpo: aresta superior = largura da peca (w)
  if (
    /gav_lat|gaveta_lat|gav_costa|gaveta_costa|gaveta_traseira|gav_frent_int|gaveta_frente_int|frente_int/.test(
      t
    ) ||
    (t.includes("gaveta") &&
      (t.includes("lateral") ||
        t.includes("costa") ||
        t.includes("traseira") ||
        (t.includes("frente") && t.includes("int"))))
  ) {
    return { front: w || h, back: 0, left: 0, right: 0 };
  }

  if (t.includes("lateral") || t.includes("left") || t.includes("right")) {
    return { front: h, back: h, left: d, right: d };
  }
  if (t.includes("costa") || t.includes("back")) {
    return { front: h, back: h, left: w, right: w };
  }
  if (t.includes("prateleira") || t.includes("shelf")) {
    return { front: w, back: w, left: d || h, right: d || h };
  }
  if (t.includes("porta") || t.includes("frente_fixa")) {
    return { front: w, back: w, left: h, right: h };
  }
  if (t.includes("remate") || t.includes("rodape") || t.includes("roda_pe")) {
    // Perimetro do perfil: 2*(L+A)
    const peri = 2 * (w + h);
    const half = peri / 2;
    return { front: half / 2, back: half / 2, left: half / 2, right: half / 2 };
  }
  if (t === "cima" || t === "fundo" || t.includes("tampo")) {
    return { front: w, back: w, left: d || h, right: d || h };
  }
  return { front: w, back: w, left: d || h, right: d || h };
}
