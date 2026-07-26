/**
 * measures/ — Calculos de pecas e folgas do Sistema Europeu (Modelo B).
 * Funcoes puras, validadas contra regras oficiais do catalogo.
 */

import type { DrawerEuropeanModel, EuropeanDrawerBoxInput } from "../types";

const FRONT_GAP_PER_SIDE_MM = 1;

/** Largura interna da caixa (modulo) apos laterais de madeira. */
export function calcBoxInternalWidthMm(box: EuropeanDrawerBoxInput): number {
  return Math.max(0, box.dimensoes.largura - 2 * box.espessura);
}

/**
 * Largura interna do corpo da gaveta (regra oficial por marca).
 * body = caixa interna - 2 * clearanceMm
 */
export function calcDrawerInternalWidthMm(
  box: EuropeanDrawerBoxInput,
  model: DrawerEuropeanModel
): number {
  const boxInternal = calcBoxInternalWidthMm(box);
  return Math.max(0, boxInternal - 2 * model.side.clearanceMm);
}

/** Frente: cobre a abertura com folga industrial 1 mm por lado. */
export function calcFrontWidthMm(box: EuropeanDrawerBoxInput): number {
  const opening = calcBoxInternalWidthMm(box);
  return Math.max(0, opening - 2 * FRONT_GAP_PER_SIDE_MM);
}

/** Altura da frente ? altura do sistema (ajustavel depois). */
export function calcFrontHeightMm(systemHeightMm: number, frontGapMm = FRONT_GAP_PER_SIDE_MM): number {
  return Math.max(0, systemHeightMm - 2 * frontGapMm);
}

/** Fundo: largura do corpo util; profundidade ? runner - engates tipicos. */
export function calcBottomWidthMm(internalWidthMm: number, bottomInsetMm = 0): number {
  return Math.max(0, internalWidthMm - 2 * bottomInsetMm);
}

export function calcBottomDepthMm(runnerDepthMm: number, frontEngagementMm = 10, rearEngagementMm = 10): number {
  return Math.max(0, runnerDepthMm - frontEngagementMm - rearEngagementMm);
}

/**
 * Laterais madeira: em caixa metalica tipicamente 0 (o sistema e metalico).
 * Mantido para cutlist opcional / madeira tradicional.
 */
export function calcWoodSideDepthMm(runnerDepthMm: number, metalBox: boolean): number {
  return metalBox ? 0 : runnerDepthMm;
}

export function calcBackWidthMm(internalWidthMm: number): number {
  return Math.max(0, internalWidthMm);
}

export function calcBackHeightMm(systemHeightMm: number, bottomThicknessMm: number): number {
  return Math.max(0, systemHeightMm - bottomThicknessMm);
}

/** Folgas industriais documentadas. */
export function calcIndustrialClearances(model: DrawerEuropeanModel) {
  return {
    sideClearanceEachMm: model.side.clearanceMm,
    sideClearanceTotalMm: 2 * model.side.clearanceMm,
    frontGapEachMm: FRONT_GAP_PER_SIDE_MM,
    frontGapTotalMm: 2 * FRONT_GAP_PER_SIDE_MM,
    assemblyToleranceMm: model.assembly.toleranceMm,
  };
}

export function pickRunnerDepthMm(
  model: DrawerEuropeanModel,
  requestedDepthMm: number,
  boxDepthMm: number,
  boxThicknessMm: number
): number {
  const maxUseful = Math.max(0, boxDepthMm - boxThicknessMm - 20);
  const candidates = model.depthsMm.filter((d) => d <= maxUseful + 0.5);
  const pool = candidates.length > 0 ? candidates : model.depthsMm;
  let best = pool[0]!;
  let bestDist = Math.abs(best - requestedDepthMm);
  for (const d of pool) {
    const dist = Math.abs(d - requestedDepthMm);
    if (dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  return best;
}
