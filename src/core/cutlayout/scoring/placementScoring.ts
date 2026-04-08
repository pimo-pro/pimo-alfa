import type { CutPlacement, SheetDefinition } from "../cutLayoutTypes";
import type { PlacementCandidate, RotationScoringConfig } from "./rotationScoring";

const EPS = 0.001;

/**
 * Contexto de chapa passado opcionalmente a scorePlacement.
 * Permite ajustar pesos consoante a posição da chapa no layout global
 * (chapas tardias recebem penalizações extra contra bolsões/isolamento).
 * Backward-compatible: callers existentes que não passam ctx continuam a funcionar.
 */
export type ContextoChapa = {
  /** Índice da chapa atual no layout (0-based). */
  sheetIndex: number;
  /** Estimativa do número total de chapas no layout atual. */
  totalSheets: number;
};

export function buildCandidateCoordinates(
  placed: CutPlacement[],
  pieceW: number,
  pieceH: number,
  sheet: SheetDefinition,
  kerf: number
): Array<{ x: number; y: number }> {
  const xs = new Set<number>([0, Math.max(0, sheet.largura_mm - pieceW)]);
  const ys = new Set<number>([0, Math.max(0, sheet.altura_mm - pieceH)]);
  for (const p of placed) {
    xs.add(Math.max(0, p.x_mm + p.largura_mm + kerf));
    ys.add(Math.max(0, p.y_mm + p.altura_mm + kerf));
    xs.add(Math.max(0, p.x_mm - pieceW - kerf));
    ys.add(Math.max(0, p.y_mm - pieceH - kerf));
  }
  const out: Array<{ x: number; y: number }> = [];
  const xList = Array.from(xs).filter((x) => x + pieceW <= sheet.largura_mm + EPS);
  const yList = Array.from(ys).filter((y) => y + pieceH <= sheet.altura_mm + EPS);
  for (const x of xList) {
    for (const y of yList) out.push({ x, y });
  }
  return out;
}

export function computePlacementCompactnessScore(
  x: number,
  y: number,
  w: number,
  h: number,
  sheet: SheetDefinition
): number {
  const rightSlack = Math.max(0, sheet.largura_mm - (x + w));
  const topSlack = Math.max(0, sheet.altura_mm - (y + h));
  const localWaste = rightSlack * h + topSlack * w;
  const compactBonus = 1 - (x / Math.max(1, sheet.largura_mm)) * 0.35 - (y / Math.max(1, sheet.altura_mm)) * 0.65;
  return compactBonus * 100000 - localWaste;
}

export function findBestResidualPlacement(
  target: CutPlacement,
  existing: CutPlacement[],
  sheet: SheetDefinition,
  kerf: number,
  deps: {
    isInsideSheet: (_x: number, _y: number, _w: number, _h: number, _sheet: SheetDefinition) => boolean;
    overlaps: (
      _x: number,
      _y: number,
      _w: number,
      _h: number,
      _placed: Array<{ x: number; y: number; w: number; h: number }>,
      _kerf: number
    ) => boolean;
  }
): CutPlacement | null {
  const variants = [
    { w: target.largura_mm, h: target.altura_mm, rotacao: target.rotacao },
    { w: target.altura_mm, h: target.largura_mm, rotacao: target.rotacao === 90 ? 0 : 90 },
  ].filter((v, i, arr) => i === 0 || v.w !== arr[0].w || v.h !== arr[0].h);

  const placedRects = existing.map((p) => ({ x: p.x_mm, y: p.y_mm, w: p.largura_mm, h: p.altura_mm }));
  let best: CutPlacement | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const v of variants) {
    const coords = buildCandidateCoordinates(existing, v.w, v.h, sheet, kerf);
    for (const c of coords) {
      if (!deps.isInsideSheet(c.x, c.y, v.w, v.h, sheet)) continue;
      if (deps.overlaps(c.x, c.y, v.w, v.h, placedRects, kerf)) continue;
      const score = computePlacementCompactnessScore(c.x, c.y, v.w, v.h, sheet);
      if (score > bestScore) {
        bestScore = score;
        best = {
          ...target,
          x_mm: c.x,
          y_mm: c.y,
          largura_mm: v.w,
          altura_mm: v.h,
          rotacao: v.rotacao,
        };
      }
    }
  }
  return best;
}

export function getSheetBoundingBox(placements: CutPlacement[]) {
  if (placements.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, area: 0 };
  const minX = Math.min(...placements.map((p) => p.x_mm));
  const minY = Math.min(...placements.map((p) => p.y_mm));
  const maxX = Math.max(...placements.map((p) => p.x_mm + p.largura_mm));
  const maxY = Math.max(...placements.map((p) => p.y_mm + p.altura_mm));
  return { minX, minY, maxX, maxY, area: Math.max(1, (maxX - minX) * (maxY - minY)) };
}

export function scorePlacement(
  sheet: SheetDefinition,
  placement: PlacementCandidate,
  currentUtilization: number,
  rotationCfg: RotationScoringConfig,
  ctx?: ContextoChapa
): number {
  const sheetArea = Math.max(1, sheet.largura_mm * sheet.altura_mm);
  const areaGain = (placement.w * placement.h) / sheetArea;
  const bottomLeftBias =
    1 - (placement.y / Math.max(1, sheet.altura_mm)) - (placement.x / Math.max(1, sheet.largura_mm)) * 0.5;
  const rightSlack = Math.max(0, sheet.largura_mm - (placement.x + placement.w));
  const topSlack = Math.max(0, sheet.altura_mm - (placement.y + placement.h));
  const localWaste = rightSlack * placement.h + topSlack * placement.w;
  const compactness01 = 1 - Math.min(1, localWaste / sheetArea);
  // Fase 3: compactness amplificado ×1.35 para forçar layouts mais densos.
  const compactnessScore = compactness01 * 0.22 * 1.35;
  const expectedUtil = currentUtilization + areaGain;
  // Regra industrial R2: encher ao máximo a chapa atual antes de abrir nova.
  // Bónus não-linear: começa mais cedo (80% vs 85%) e com inclinação mais forte (2.5 vs 2.0).
  // Regra industrial R6: desperdício concentrado numa só área (lado direito/topo).
  // O bónus de utilização elevada incentiva o motor a "fechar" a chapa corrente.
  const utilizationReward =
    Math.min(0.5, expectedUtil * 0.55) +
    (expectedUtil > 0.80 ? Math.min(0.25, (expectedUtil - 0.80) * 2.5) : 0);

  // Fator de chapa tardia: 0.0 nas primeiras chapas, crescendo linearmente até 1.0 a partir de 40% do total.
  const lateFactor =
    ctx && ctx.totalSheets > 1
      ? Math.max(0, Math.min(1, (ctx.sheetIndex / ctx.totalSheets - 0.4) / 0.6))
      : 0;

  const tightnessVal = placement.tightnessScore ?? 0;

  // Fase 3: tightnessBonus reforçado nas chapas tardias para forçar compactação.
  const tightnessBonus = tightnessVal * (0.25 + lateFactor * 0.35);

  // Fase 3: gapFillBonus reforçado para peças pequenas em gaps apertados.
  const isSmall = placement.w * placement.h < sheetArea * 0.05;
  const gapFillBonus = isSmall && tightnessVal >= 0.5 ? 0.10 + lateFactor * 0.15 : 0;

  // Fase 3: isolationPenalty aumentada (0.22 vs 0.15) — penaliza mais peças sem vizinhos.
  const isolationPenalty = lateFactor > 0 && tightnessVal === 0 ? lateFactor * 0.22 : 0;

  // Fase 3: islandPenalty — penaliza peças que criam "ilhas" (tightnessScore < 0.15).
  const islandPenalty = (tightnessVal < 0.15 ? 0.12 : 0) * (1 + lateFactor);

  let rotationScore = 0;
  if (rotationCfg.rotationPreferenceMode !== "disabled") {
    if (placement.rotation === 90) {
      rotationScore += rotationCfg.rotationWeight * (1 + Math.max(0, placement.rotationDelta));
    } else if (placement.alternativeRotationAvailable && placement.rotationDelta > 0) {
      rotationScore -= rotationCfg.rotationPenalty * placement.rotationDelta;
    }
  }
  return (
    areaGain * 2.5 +
    // Regra industrial R6: peso aumentado (0.50 vs 0.30) para empurrar peças para o
    // canto inferior-esquerdo, concentrando o desperdício numa zona contígua.
    bottomLeftBias * 0.50 +
    utilizationReward +
    placement.orientationScore * 0.25 +
    rotationScore +
    compactnessScore +
    tightnessBonus +
    gapFillBonus -
    isolationPenalty -
    islandPenalty
  );
}
