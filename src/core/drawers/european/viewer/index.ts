/**
 * viewer/ — Dados de renderizacao do Sistema Europeu (Modelo B).
 */

import type {
  DrawerGeometry,
  EuropeanDrawerHole,
  EuropeanDrawerViewerData,
} from "../types";

export function buildEuropeanViewerData(params: {
  drawers: Array<{
    id: string;
    index: number;
    geometry: DrawerGeometry;
    holes: EuropeanDrawerHole[];
  }>;
}): EuropeanDrawerViewerData {
  return {
    drawers: params.drawers.map((d) => ({
      id: d.id,
      index: d.index,
      geometry: d.geometry,
      holes: d.holes,
      openProgress: 0,
      maxPullMm: Math.max(100, d.geometry.runnerDepthMm - 40),
    })),
  };
}

/** Interpola abertura (0..1) ? offset Z de pull (mm). */
export function calcEuropeanDrawerPullOffsetMm(progress: number, maxPullMm: number): number {
  const p = Math.max(0, Math.min(1, progress));
  // Ease-out suave (similar a curvas europeias).
  const eased = 1 - Math.pow(1 - p, 2);
  return eased * maxPullMm;
}
