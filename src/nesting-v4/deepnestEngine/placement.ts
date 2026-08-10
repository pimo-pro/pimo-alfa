/**
 * Placement via NFP rectangular + heurísticas (adaptado de SVGnest placementworker).
 * Sem ClipperLib: candidatos nas arestas do NFP + verificação de colisão AABB.
 */

import {
  aabbOverlap,
  getPolygonBounds,
  noFitPolygonRectangle,
  outerNfpRectangles,
  pointOnRectBoundary,
  rectPolygon,
  rotatePolygon,
  type DnPolygon,
} from "./geometry";

export type PlacedPart = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
};

export type PlacementResult = {
  placements: PlacedPart[];
  unplacedIds: string[];
  sheetsUsed: number;
  fitness: number;
};

export type PlacementConfig = {
  kerfMm: number;
  marginMm: number;
  binWidthMm: number;
  binHeightMm: number;
  /** Amostras por aresta do NFP para candidatos. */
  nfpSamplesPerEdge: number;
  mode: "aggressive" | "conservative";
};

function effectiveSize(poly: DnPolygon, rotation: number): { w: number; h: number } {
  const rotated = rotatePolygon(poly, rotation);
  const b = getPolygonBounds(rotated);
  return { w: b.width, h: b.height };
}

function candidatePositions(
  binW: number,
  binH: number,
  partW: number,
  partH: number,
  placed: PlacedPart[],
  margin: number,
  kerf: number,
  samples: number,
  mode: "aggressive" | "conservative"
): Array<{ x: number; y: number }> {
  const usableW = binW - margin * 2;
  const usableH = binH - margin * 2;
  const binPoly = rectPolygon(margin, margin, usableW, usableH);
  const partPoly = rectPolygon(0, 0, partW, partH);
  const inner = noFitPolygonRectangle(binPoly, partPoly);
  if (!inner || inner.length === 0) return [];

  const binNfpBounds = getPolygonBounds(inner[0]!);
  const candidates: Array<{ x: number; y: number }> = [];

  // canto preferido (SVGnest: esquerda)
  candidates.push({ x: binNfpBounds.x, y: binNfpBounds.y });

  if (placed.length === 0) {
    return candidates;
  }

  for (const p of placed) {
    const outer = outerNfpRectangles(
      { x: p.x, y: p.y, w: p.w + kerf, h: p.h + kerf },
      partW,
      partH
    );
    const pts = pointOnRectBoundary(outer, mode === "aggressive" ? samples : Math.max(2, samples - 2));
    for (const pt of pts) {
      if (
        pt.x >= binNfpBounds.x - 1e-6 &&
        pt.y >= binNfpBounds.y - 1e-6 &&
        pt.x + partW <= binNfpBounds.x + binNfpBounds.width + 1e-6 &&
        pt.y + partH <= binNfpBounds.y + binNfpBounds.height + 1e-6
      ) {
        candidates.push(pt);
      }
    }
  }

  // bottom-left preference
  candidates.sort((a, b) => a.y - b.y || a.x - b.x);
  return candidates;
}

function fits(
  x: number,
  y: number,
  w: number,
  h: number,
  placed: PlacedPart[],
  kerf: number,
  binW: number,
  binH: number,
  margin: number
): boolean {
  if (x < margin - 1e-6 || y < margin - 1e-6) return false;
  if (x + w > binW - margin + 1e-6 || y + h > binH - margin + 1e-6) return false;
  const box = { x, y, w, h };
  for (const p of placed) {
    if (aabbOverlap(box, { x: p.x, y: p.y, w: p.w, h: p.h }, kerf)) return false;
  }
  return true;
}

/**
 * Empacota uma sequência de polígonos (já com rotação desejada) em chapas.
 * Fitness SVGnest-like: +1 por chapa + largura normalizada usada.
 */
export function placePaths(
  parts: Array<DnPolygon & { id: string }>,
  rotations: number[],
  config: PlacementConfig
): PlacementResult {
  const remaining = parts.map((p, i) => ({
    poly: p,
    id: p.id,
    rotation: ((rotations[i] ?? 0) % 360 + 360) % 360,
  }));

  const allPlacements: PlacedPart[] = [];
  const unplacedIds: string[] = [];
  let sheetIndex = 0;
  let fitness = 0;

  while (remaining.length > 0) {
    const placedOnSheet: PlacedPart[] = [];
    fitness += 1;
    let progress = true;

    while (progress && remaining.length > 0) {
      progress = false;
      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i]!;
        const { w, h } = effectiveSize(item.poly, item.rotation);
        const candidates = candidatePositions(
          config.binWidthMm,
          config.binHeightMm,
          w,
          h,
          placedOnSheet,
          config.marginMm,
          config.kerfMm,
          config.nfpSamplesPerEdge,
          config.mode
        );

        let chosen: { x: number; y: number } | null = null;
        for (const c of candidates) {
          if (
            fits(
              c.x,
              c.y,
              w,
              h,
              placedOnSheet,
              config.kerfMm,
              config.binWidthMm,
              config.binHeightMm,
              config.marginMm
            )
          ) {
            chosen = c;
            break;
          }
        }

        if (!chosen) continue;

        const placed: PlacedPart = {
          id: item.id,
          x: chosen.x,
          y: chosen.y,
          w,
          h,
          rotation: item.rotation === 90 || item.rotation === 270 ? 90 : 0,
        };
        placedOnSheet.push(placed);
        allPlacements.push({ ...placed, /* sheet encoded later */ });
        // tag sheet via mutation of id map — return sheetsUsed separately
        (placed as PlacedPart & { sheetIndex?: number }).sheetIndex = sheetIndex;
        remaining.splice(i, 1);
        progress = true;
        break;
      }
    }

    if (placedOnSheet.length === 0) {
      // nada coube nesta chapa — marcar restantes como unplaced
      for (const r of remaining) unplacedIds.push(r.id);
      break;
    }

    // largura usada na fitness (SVGnest: minimizar largura)
    let maxX = 0;
    for (const p of placedOnSheet) maxX = Math.max(maxX, p.x + p.w);
    fitness += maxX / Math.max(config.binWidthMm, 1);
    sheetIndex += 1;

    if (remaining.length > 0 && sheetIndex > 200) {
      for (const r of remaining) unplacedIds.push(r.id);
      break;
    }
  }

  // re-emit with sheetIndex attached via parallel array in runner
  return {
    placements: allPlacements,
    unplacedIds,
    sheetsUsed: sheetIndex,
    fitness,
  };
}

/** placePaths com índice de chapa explícito. */
export function placePathsMultiSheet(
  parts: Array<DnPolygon & { id: string }>,
  rotations: number[],
  config: PlacementConfig
): PlacementResult & { sheetOf: Record<string, number> } {
  const remaining = parts.map((p, i) => ({
    poly: p,
    id: p.id,
    rotation: ((rotations[i] ?? 0) % 360 + 360) % 360,
  }));

  const placements: PlacedPart[] = [];
  const sheetOf: Record<string, number> = {};
  const unplacedIds: string[] = [];
  let sheetIndex = 0;
  let fitness = 0;

  while (remaining.length > 0) {
    const placedOnSheet: PlacedPart[] = [];
    fitness += 1;
    let progress = true;

    while (progress && remaining.length > 0) {
      progress = false;
      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i]!;
        const { w, h } = effectiveSize(item.poly, item.rotation);
        const candidates = candidatePositions(
          config.binWidthMm,
          config.binHeightMm,
          w,
          h,
          placedOnSheet,
          config.marginMm,
          config.kerfMm,
          config.nfpSamplesPerEdge,
          config.mode
        );
        let chosen: { x: number; y: number } | null = null;
        for (const c of candidates) {
          if (
            fits(
              c.x,
              c.y,
              w,
              h,
              placedOnSheet,
              config.kerfMm,
              config.binWidthMm,
              config.binHeightMm,
              config.marginMm
            )
          ) {
            chosen = c;
            break;
          }
        }
        if (!chosen) continue;
        const placed: PlacedPart = {
          id: item.id,
          x: chosen.x,
          y: chosen.y,
          w,
          h,
          rotation: item.rotation === 90 || item.rotation === 270 ? 90 : 0,
        };
        placedOnSheet.push(placed);
        placements.push(placed);
        sheetOf[item.id] = sheetIndex;
        remaining.splice(i, 1);
        progress = true;
        break;
      }
    }

    if (placedOnSheet.length === 0) {
      for (const r of remaining) unplacedIds.push(r.id);
      break;
    }
    let maxX = 0;
    for (const p of placedOnSheet) maxX = Math.max(maxX, p.x + p.w);
    fitness += maxX / Math.max(config.binWidthMm, 1);
    sheetIndex += 1;
    if (remaining.length > 0 && sheetIndex > 200) {
      for (const r of remaining) unplacedIds.push(r.id);
      break;
    }
  }

  return { placements, unplacedIds, sheetsUsed: sheetIndex, fitness, sheetOf };
}
