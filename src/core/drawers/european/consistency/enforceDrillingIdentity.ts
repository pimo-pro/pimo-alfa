/**
 * enforceDrillingIdentity.ts — pieceRef de furos alinhado ao SSOT.
 */

import type { EuropeanDrawerHole } from "../types";
import { enforceNaming } from "./enforceNaming";
import { resolveBaseCode } from "./namingMap";

/**
 * Corrige pieceRef de peças de gaveta para códigos industriais.
 * module_lat_* e refs de hardware/módulo preservados.
 */
export function enforceDrillingIdentity(
  holes: EuropeanDrawerHole[],
  options?: { drawerCount?: number; drawerIndex0?: number }
): EuropeanDrawerHole[] {
  const drawerCount = Math.max(1, options?.drawerCount ?? 1);
  const drawerIndex0 = Math.max(0, options?.drawerIndex0 ?? 0);

  return holes.map((h) => {
    const base = resolveBaseCode(h.pieceRef);
    if (!base) return h;
    const id = enforceNaming({
      pieceRef: h.pieceRef,
      codigo: h.pieceRef,
      drawerIndex0,
      drawerCount,
    });
    if (!id) return h;
    return { ...h, pieceRef: id.codigo };
  });
}
