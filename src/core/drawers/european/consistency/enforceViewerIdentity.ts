/**
 * enforceViewerIdentity.ts ù Identidade industrial no viewer data.
 * Sem alterar geometria/materiais.
 */

import type { EuropeanDrawerViewerData } from "../types";
import { enforceDrillingIdentity } from "./enforceDrillingIdentity";

export type EuropeanViewerPieceMeta = {
  id: string;
  label: string;
  name: string;
  codigo: string;
};

/**
 * Anexa/normaliza identidade nos drawers do viewer.
 * Geometria intacta; holes pieceRef normalizados; id de drawer estùvel.
 */
export function enforceViewerIdentity(
  viewer: EuropeanDrawerViewerData,
  options?: { drawerCount?: number }
): EuropeanDrawerViewerData {
  const drawerCount = Math.max(1, options?.drawerCount ?? (viewer.drawers.length || 1));

  return {
    drawers: viewer.drawers.map((d) => {
      const holes = enforceDrillingIdentity(d.holes, {
        drawerCount,
        drawerIndex0: d.index,
      });
      return {
        ...d,
        holes,
        // id permanece eu-drawer-*; metadados de peùa vivem nos holes pieceRef canùnicos
      };
    }),
  };
}
