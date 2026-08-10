/**
 * Motor Deepnest — Nesting V4 (visual/análise).
 *
 * Adaptação de SVGnest (MIT): GA + NFP rectangular + packing + SA opcional.
 * Não altera writer TCN «mo» nem pipeline CNC de produção.
 */

import type { V4Piece, V4Sheet, V4Placement, V4AutoLayoutResult } from "../nestingV4Types";
import type { NestingV4Settings } from "../nestingV4Settings";
import { allowRotationForPiece } from "../nestingV4Settings";
import { defaultSheetFromSettings } from "../nestingSheetsFactory";
import { rectPolygon, type DnPolygon } from "./geometry";
import { GeneticAlgorithm } from "./geneticAlgorithm";
import { placePathsMultiSheet } from "./placement";
import { runSimulatedAnnealing } from "./simulatedAnnealing";
import type { DeepnestOptions } from "./deepnestOptions";
import { loadDeepnestRules, resolveDeepnestOptions } from "./deepnestRules";

function pieceToPolygon(piece: V4Piece): DnPolygon & { id: string } {
  const poly = rectPolygon(0, 0, piece.widthMm, piece.heightMm) as DnPolygon & { id: string };
  poly.id = piece.id;
  return poly;
}

function normalizeIndustrialRotation(deg: number, allowRotate: boolean): number {
  if (!allowRotate) return 0;
  const r = ((Math.round(deg) % 360) + 360) % 360;
  if (r === 90 || r === 270) return 90;
  return 0;
}

export function runDeepnestAutoLayout(
  pieces: V4Piece[],
  sheets: V4Sheet[],
  settings: NestingV4Settings,
  optionsOverride?: Partial<DeepnestOptions>
): V4AutoLayoutResult {
  if (pieces.length === 0) {
    return { placements: [], unplacedPieceIds: [], sheetsUsed: 0, pieces, sheets };
  }

  const rules = loadDeepnestRules();
  const opts = resolveDeepnestOptions({
    kerfMm: settings.kerfMm || rules.kerfMm,
    marginMm: settings.marginMm || rules.marginMm,
    ...optionsOverride,
  });

  const activeSheets = sheets.length > 0 ? sheets : [defaultSheetFromSettings(settings)];
  const primary = activeSheets[0]!;
  const bin = rectPolygon(0, 0, primary.widthMm, primary.heightMm);

  const adam = pieces.map(pieceToPolygon);
  const ga = new GeneticAlgorithm(adam, bin, {
    populationSize: opts.populationSize,
    mutationRate: opts.mutationRate,
    rotations: opts.rotations,
  });

  // Fix angles for grain-locked pieces
  for (const ind of ga.population) {
    for (let i = 0; i < ind.placement.length; i++) {
      const piece = pieces.find((p) => p.id === ind.placement[i]!.id);
      if (!piece) continue;
      const allow = opts.respectGrainLock ? allowRotationForPiece(piece, settings) : settings.rotationMode !== "none";
      ind.rotation[i] = normalizeIndustrialRotation(ind.rotation[i] ?? 0, allow);
    }
  }

  const evaluateIndividual = (placement: DnPolygon[], rotation: number[]) => {
    const parts = placement.map((p) => p as DnPolygon & { id: string });
    const result = placePathsMultiSheet(parts, rotation, {
      kerfMm: opts.kerfMm,
      marginMm: opts.marginMm,
      binWidthMm: primary.widthMm,
      binHeightMm: primary.heightMm,
      nfpSamplesPerEdge: opts.nfpSamplesPerEdge,
      mode: opts.mode,
    });
    // SVGnest: lower is better; penalizar unplaced
    return result.fitness + result.unplacedIds.length * 1000;
  };

  for (const ind of ga.population) {
    ind.fitness = evaluateIndividual(ind.placement, ind.rotation);
  }

  for (let g = 0; g < opts.generations; g++) {
    ga.generation();
    for (const ind of ga.population) {
      for (let i = 0; i < ind.placement.length; i++) {
        const piece = pieces.find((p) => p.id === ind.placement[i]!.id);
        if (!piece) continue;
        const allow = opts.respectGrainLock
          ? allowRotationForPiece(piece, settings)
          : settings.rotationMode !== "none";
        ind.rotation[i] = normalizeIndustrialRotation(ind.rotation[i] ?? 0, allow);
      }
      ind.fitness = evaluateIndividual(ind.placement, ind.rotation);
    }
  }

  ga.population.sort((a, b) => (a.fitness ?? 1e9) - (b.fitness ?? 1e9));
  let best = ga.population[0]!;

  if (opts.enableSa && opts.saIterations > 0) {
    const basePlacement = best.placement;
    const order = basePlacement.map((_, i) => i);
    const saBest = runSimulatedAnnealing(
      {
        order,
        rotations: best.rotation.slice(),
        fitness: best.fitness ?? 1e9,
      },
      (ind) => {
        const ordered = ind.order.map((idx) => basePlacement[idx]!);
        const rots = ind.order.map((idx) => {
          const piece = pieces.find((p) => p.id === basePlacement[idx]!.id);
          const allow = piece
            ? opts.respectGrainLock
              ? allowRotationForPiece(piece, settings)
              : settings.rotationMode !== "none"
            : false;
          return normalizeIndustrialRotation(ind.rotations[idx] ?? 0, allow);
        });
        return evaluateIndividual(ordered, rots);
      },
      {
        iterations: opts.saIterations,
        initialTemperature: opts.saInitialTemperature,
        coolingRate: opts.saCoolingRate,
        seed: opts.seed,
      }
    );
    best = {
      placement: saBest.order.map((idx) => basePlacement[idx]!),
      rotation: saBest.order.map((idx) => {
        const piece = pieces.find((p) => p.id === basePlacement[idx]!.id);
        const allow = piece
          ? opts.respectGrainLock
            ? allowRotationForPiece(piece, settings)
            : settings.rotationMode !== "none"
          : false;
        return normalizeIndustrialRotation(saBest.rotations[idx] ?? 0, allow);
      }),
      fitness: saBest.fitness,
    };
  }

  const packed = placePathsMultiSheet(
    best.placement.map((p) => p as DnPolygon & { id: string }),
    best.rotation,
    {
      kerfMm: opts.kerfMm,
      marginMm: opts.marginMm,
      binWidthMm: primary.widthMm,
      binHeightMm: primary.heightMm,
      nfpSamplesPerEdge: opts.nfpSamplesPerEdge,
      mode: opts.mode,
    }
  );

  const piecesById = new Map(pieces.map((p) => [p.id, { ...p }]));
  const placements: V4Placement[] = [];
  const usedSheets = Math.max(1, packed.sheetsUsed);
  const outSheets: V4Sheet[] = Array.from({ length: usedSheets }, (_, index) => ({
    index,
    widthMm: primary.widthMm,
    heightMm: primary.heightMm,
    thicknessMm: primary.thicknessMm,
    materialId: primary.materialId,
    materialName: primary.materialName,
  }));

  for (const pl of packed.placements) {
    const sheetIndex = packed.sheetOf[pl.id] ?? 0;
    placements.push({
      pieceId: pl.id,
      sheetIndex,
      xMm: pl.x,
      yMm: pl.y,
      rotated: pl.rotation === 90,
    });
    const piece = piecesById.get(pl.id);
    if (piece) piece.rotation = pl.rotation === 90 ? 90 : 0;
  }

  return {
    placements,
    unplacedPieceIds: packed.unplacedIds,
    sheetsUsed: usedSheets,
    sheets: outSheets,
    pieces: Array.from(piecesById.values()),
    selectedStrategy: "deepnest-ga-nfp",
    selectedBinHeuristic: opts.mode,
  };
}
