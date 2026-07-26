/**
 * viewer/perf.ts — Chaves e cache de dados de viewer Modelo B.
 * Não toca em meshes Three.js / industrial — só estruturas de dados.
 */

import type { DrawerGeometry, EuropeanDrawerHole, EuropeanDrawerViewerData } from "../types";
import { memo } from "../perf/memo";

export type EuropeanViewerDimKey = {
  boxId: string;
  stackIndex: number;
  runnerDepthMm: number;
  bodyDepthMm: number;
  externalWidthMm: number;
  usefulHeightMm: number;
  frontW: number;
  frontH: number;
  frontT: number;
  bottomW: number;
  bottomD: number;
  dualFront: boolean;
};

export function buildViewerDimKey(
  boxId: string,
  stackIndex: number,
  geometry: DrawerGeometry,
  dualFront: boolean
): EuropeanViewerDimKey {
  return {
    boxId,
    stackIndex,
    runnerDepthMm: geometry.runnerDepthMm,
    bodyDepthMm: geometry.bodyDepthMm,
    externalWidthMm: geometry.externalWidthMm,
    usefulHeightMm: geometry.usefulHeightMm,
    frontW: geometry.front.widthMm,
    frontH: geometry.front.heightMm,
    frontT: geometry.front.thicknessMm,
    bottomW: geometry.bottom.widthMm,
    bottomD: geometry.bottom.depthMm,
    dualFront,
  };
}

function buildViewerDataCore(params: {
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

const buildEuropeanViewerDataMemo = memo(buildViewerDataCore, {
  namespace: "eu.viewer.data",
  maxSize: 128,
});

/** Viewer data com cache — mesmo resultado que buildEuropeanViewerData. */
export function getCachedEuropeanViewerData(
  drawers: Array<{
    id: string;
    index: number;
    geometry: DrawerGeometry;
    holes: EuropeanDrawerHole[];
  }>
): EuropeanDrawerViewerData {
  return buildEuropeanViewerDataMemo({ drawers });
}
