/**
 * plannerMeasurements.ts ù Medidas visuais da cozinha (documental).
 * Consome overlay se existir ù sem alterar overlay.
 */

import type { EuropeanOverlay } from "../drawers/european/overlay";
import type { PlannerGridConfig } from "./plannerGrid";
import type { PlannerPlacedModule } from "./plannerModules";

export type PlannerGapMeasure = {
  fromInstanceId: string;
  toInstanceId: string;
  gapMm: number;
  axis: "x" | "y";
};

export type PlannerMeasurements = {
  totalWidthMm: number;
  totalDepthMm: number;
  totalHeightMm: number;
  occupiedWidthMm: number;
  moduleCount: number;
  gaps: PlannerGapMeasure[];
  openings: Array<{ label: string; widthMm: number; heightMm: number }>;
  overlayInternal?: {
    status?: string;
    aberturaCount: number;
    gapCount: number;
  };
};

export function buildPlannerMeasurements(
  modules: PlannerPlacedModule[],
  grid: PlannerGridConfig,
  overlay?: EuropeanOverlay | null
): PlannerMeasurements {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let maxElev = 0;

  for (const m of modules) {
    minX = Math.min(minX, m.xMm);
    maxX = Math.max(maxX, m.xMm + m.widthMm);
    minY = Math.min(minY, m.yMm);
    maxY = Math.max(maxY, m.yMm + m.depthMm);
    maxElev = Math.max(maxElev, m.elevationYMm + m.heightMm);
  }

  if (!modules.length) {
    minX = 0;
    maxX = 0;
    minY = 0;
    maxY = 0;
  }

  const sorted = [...modules].sort((a, b) => a.xMm - b.xMm || a.yMm - b.yMm);
  const gaps: PlannerGapMeasure[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const gapX = b.xMm - (a.xMm + a.widthMm);
    if (gapX > 0 && Math.abs(a.yMm - b.yMm) < Math.max(a.depthMm, b.depthMm)) {
      gaps.push({
        fromInstanceId: a.instanceId,
        toInstanceId: b.instanceId,
        gapMm: gapX,
        axis: "x",
      });
    }
  }

  const openings =
    overlay?.aberturas?.items?.map((o) => ({
      label: o.label || o.id || "abertura",
      widthMm: o.valueMm ?? 0,
      heightMm: 0,
    })) ?? [];

  return {
    totalWidthMm: grid.widthMm,
    totalDepthMm: grid.depthMm,
    totalHeightMm: Math.max(grid.heightMm, maxElev),
    occupiedWidthMm: modules.length ? Math.max(0, maxX - minX) : 0,
    moduleCount: modules.length,
    gaps,
    openings,
    overlayInternal: overlay
      ? {
          status: overlay.report?.status,
          aberturaCount: overlay.report?.aberturaCount ?? openings.length,
          gapCount: overlay.report?.gapCount ?? overlay.gaps?.items?.length ?? 0,
        }
      : undefined,
  };
}
