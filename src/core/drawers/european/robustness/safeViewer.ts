/**
 * safeViewer.ts — Filtra drawers/peças inválidas no viewer data.
 */

import type { DrawerGeometry, DrawerPieceBox, EuropeanDrawerViewerData } from "../types";
import { ensureArray, robustDebug } from "./safeNumbers";

function pieceRenderable(p: DrawerPieceBox): boolean {
  return (
    Number.isFinite(p.widthMm) &&
    Number.isFinite(p.heightMm) &&
    Number.isFinite(p.depthMm) &&
    Number.isFinite(p.originXMm) &&
    Number.isFinite(p.originYMm) &&
    Number.isFinite(p.originZMm) &&
    p.widthMm >= 0 &&
    p.heightMm >= 0 &&
    p.depthMm >= 0
  );
}

function geometryRenderable(g: DrawerGeometry): boolean {
  const parts = [g.front, g.bottom, g.leftSide, g.rightSide, g.back];
  if (g.frontInt) parts.push(g.frontInt);
  if (!pieceRenderable(g.front) || g.front.widthMm <= 0 || g.front.heightMm <= 0) {
    return false;
  }
  for (const p of parts) {
    if (!pieceRenderable(p)) return false;
  }
  return (
    Number.isFinite(g.runnerDepthMm) &&
    Number.isFinite(g.bodyDepthMm) &&
    Number.isFinite(g.externalWidthMm)
  );
}

export function sanitizeViewerData(data: EuropeanDrawerViewerData): EuropeanDrawerViewerData {
  const drawers = ensureArray(data.drawers, "viewer.drawers")
    .map((d) => {
      if (!d?.geometry || !geometryRenderable(d.geometry)) {
        robustDebug("viewer", "drawer omitido (geometria inválida)", {
          id: d?.id,
          index: d?.index,
        });
        return null;
      }
      let maxPullMm = d.maxPullMm;
      if (!Number.isFinite(maxPullMm) || maxPullMm < 0) {
        robustDebug("viewer", "maxPullMm inválido ? clamp", maxPullMm);
        maxPullMm = 100;
      }
      return { ...d, maxPullMm };
    })
    .filter((d): d is NonNullable<typeof d> => d != null);

  return { drawers };
}
