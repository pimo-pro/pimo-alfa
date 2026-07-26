/**
 * viewer/ — Dados de renderização do Sistema Europeu (Modelo B).
 */

import type {
  DrawerGeometry,
  EuropeanDrawerHole,
  EuropeanDrawerViewerData,
} from "../types";
import { getCachedEuropeanViewerData } from "./perf";

export { buildViewerDimKey, getCachedEuropeanViewerData, type EuropeanViewerDimKey } from "./perf";

export function buildEuropeanViewerData(params: {
  drawers: Array<{
    id: string;
    index: number;
    geometry: DrawerGeometry;
    holes: EuropeanDrawerHole[];
  }>;
}): EuropeanDrawerViewerData {
  return getCachedEuropeanViewerData(params.drawers);
}

/** Interpola abertura (0..1) ? offset Z de pull (mm). */
export function calcEuropeanDrawerPullOffsetMm(progress: number, maxPullMm: number): number {
  const p = Math.max(0, Math.min(1, progress));
  const eased = 1 - Math.pow(1 - p, 2);
  return eased * maxPullMm;
}
