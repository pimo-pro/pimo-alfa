/**
 * measures/ — Cálculos de peças e folgas do Sistema Europeu (Modelo B).
 * Regras industriais: folga lateral 7 mm, corpo = corrediça ? 10, Hettich.
 */

import type { DrawerEuropeanModel, EuropeanDrawerBoxInput } from "../types";
import { selectHettichRunnerDepth, HETTICH_RUNNER_LENGTHS_MM } from "./hettichRunners";

export {
  selectHettichRunnerDepth,
  HETTICH_RUNNER_LENGTHS_MM,
  isHettichRunnerLengthMm,
  type HettichRunnerLengthMm,
} from "./hettichRunners";

/** Folga lateral por lado face às paredes internas da caixa (mm). */
export const EUROPEAN_SIDE_CLEARANCE_EACH_MM = 7;
/** Folga total (esquerda + direita). */
export const EUROPEAN_SIDE_CLEARANCE_TOTAL_MM = EUROPEAN_SIDE_CLEARANCE_EACH_MM * 2;
/** Profundidade do corpo sem frente = corrediça ? 10 mm. */
export const EUROPEAN_BODY_DEPTH_SLIDE_CLEARANCE_MM = 10;
/** Espessura das laterais / costa (mm). */
export const EUROPEAN_SIDE_THICKNESS_MM = 16;
export const EUROPEAN_BACK_THICKNESS_MM = 16;
/** Espessura do fundo (mm). */
export const EUROPEAN_BOTTOM_THICKNESS_MM = 10;
/** Encaixe do fundo nas laterais (mm por lado). */
export const EUROPEAN_BOTTOM_SIDE_INSET_MM = 10;
/** Encaixe do fundo à frente quando não há frente interna (mm). */
export const EUROPEAN_BOTTOM_FRONT_INSET_MM = 10;
/** Frente interna: espessura e folga lateral (mm). */
export const EUROPEAN_FRONT_INT_THICKNESS_MM = 16;
export const EUROPEAN_FRONT_INT_SIDE_GAP_EACH_MM = 2;
/** Folga da frente externa por lado (mm). */
const FRONT_GAP_PER_SIDE_MM = 1;

/** Largura interna da caixa (módulo) após laterais de madeira. */
export function calcBoxInternalWidthMm(box: EuropeanDrawerBoxInput): number {
  return Math.max(0, box.dimensoes.largura - 2 * box.espessura);
}

/**
 * Largura externa da gaveta (corpo):
 * larguraCaixaInterna ? 14 mm (7 mm + 7 mm).
 */
export function calcDrawerExternalWidthMm(box: EuropeanDrawerBoxInput): number {
  return Math.max(0, calcBoxInternalWidthMm(box) - EUROPEAN_SIDE_CLEARANCE_TOTAL_MM);
}

/**
 * Largura interna do corpo (entre faces internas das laterais 16 mm).
 * Mantém assinatura com model por compatibilidade; a folga industrial é fixa (7 mm).
 */
export function calcDrawerInternalWidthMm(
  box: EuropeanDrawerBoxInput,
  _model?: DrawerEuropeanModel
): number {
  void _model;
  const external = calcDrawerExternalWidthMm(box);
  return Math.max(0, external - 2 * EUROPEAN_SIDE_THICKNESS_MM);
}

/** Frente externa: cobre a abertura com folga 1 mm por lado (ajustável na UI). */
export function calcFrontWidthMm(box: EuropeanDrawerBoxInput): number {
  const opening = calcBoxInternalWidthMm(box);
  return Math.max(0, opening - 2 * FRONT_GAP_PER_SIDE_MM);
}

export function calcFrontHeightMm(systemHeightMm: number, frontGapMm = FRONT_GAP_PER_SIDE_MM): number {
  return Math.max(0, systemHeightMm - 2 * frontGapMm);
}

/** Frente interna: larguraCaixaInterna ? 4 mm (2 mm por lado). */
export function calcFrontIntWidthMm(box: EuropeanDrawerBoxInput): number {
  return Math.max(
    0,
    calcBoxInternalWidthMm(box) - 2 * EUROPEAN_FRONT_INT_SIDE_GAP_EACH_MM
  );
}

/** Profundidade do corpo sem frente = comprimento da corrediça ? 10 mm. */
export function calcBodyDepthWithoutFrontMm(runnerDepthMm: number): number {
  return Math.max(0, runnerDepthMm - EUROPEAN_BODY_DEPTH_SLIDE_CLEARANCE_MM);
}

/**
 * Fundo: entra 10 mm em cada lateral.
 * largura = externa ? 2×16 + 2×10 = externa ? 12
 */
export function calcBottomWidthMm(externalWidthMm: number): number {
  return Math.max(
    0,
    externalWidthMm - 2 * EUROPEAN_SIDE_THICKNESS_MM + 2 * EUROPEAN_BOTTOM_SIDE_INSET_MM
  );
}

/**
 * Profundidade do fundo ao longo de Z.
 * Com frente interna: corpo ? costa; sem frente int: corpo ? costa ? inset frontal 10 mm.
 */
export function calcBottomDepthMm(
  bodyDepthMm: number,
  options?: { hasInnerFront?: boolean; backThicknessMm?: number }
): number {
  const backT = options?.backThicknessMm ?? EUROPEAN_BACK_THICKNESS_MM;
  const frontInset = options?.hasInnerFront ? 0 : EUROPEAN_BOTTOM_FRONT_INSET_MM;
  return Math.max(0, bodyDepthMm - backT - frontInset);
}

/** Laterais madeira: comprimento = profundidade do corpo sem frente. */
export function calcWoodSideDepthMm(runnerDepthMm: number, _metalBox?: boolean): number {
  void _metalBox;
  return calcBodyDepthWithoutFrontMm(runnerDepthMm);
}

/** Costa entre laterais. */
export function calcBackWidthMm(externalWidthMm: number): number {
  return Math.max(0, externalWidthMm - 2 * EUROPEAN_SIDE_THICKNESS_MM);
}

export function calcBackHeightMm(systemHeightMm: number, bottomThicknessMm: number): number {
  return Math.max(0, systemHeightMm - bottomThicknessMm);
}

/** Folgas industriais documentadas (Modelo B). */
export function calcIndustrialClearances(_model?: DrawerEuropeanModel) {
  void _model;
  return {
    sideClearanceEachMm: EUROPEAN_SIDE_CLEARANCE_EACH_MM,
    sideClearanceTotalMm: EUROPEAN_SIDE_CLEARANCE_TOTAL_MM,
    frontGapEachMm: FRONT_GAP_PER_SIDE_MM,
    frontGapTotalMm: 2 * FRONT_GAP_PER_SIDE_MM,
    bodyDepthClearanceMm: EUROPEAN_BODY_DEPTH_SLIDE_CLEARANCE_MM,
    assemblyToleranceMm: 0.5,
  };
}

/**
 * Profundidade útil interna para seleção da corrediça.
 * Preferência: valor explícito; senão P externa ? costa ? margem frontal típica.
 */
export function resolveEuropeanUsefulInternalDepthMm(box: EuropeanDrawerBoxInput): number {
  if (
    typeof box.profundidadeInternaUtilMm === "number" &&
    Number.isFinite(box.profundidadeInternaUtilMm) &&
    box.profundidadeInternaUtilMm > 0
  ) {
    return box.profundidadeInternaUtilMm;
  }
  const costa =
    box.costaAtiva === false
      ? 0
      : Number.isFinite(Number(box.espessuraCosta)) && Number(box.espessuraCosta) > 0
        ? Number(box.espessuraCosta)
        : box.espessura;
  const frontT = Math.max(0, Number(box.espessura) || 0);
  return Math.max(0, box.dimensoes.profundidade - costa - frontT);
}

/**
 * Seleciona corrediça Hettich (strictly &lt; profundidade útil interna).
 * Mantém assinatura legada; ignora depths do catálogo de marca.
 */
export function pickRunnerDepthMm(
  _model: DrawerEuropeanModel,
  _requestedDepthMm: number,
  boxDepthMm: number,
  boxThicknessMm: number
): number {
  void _model;
  void _requestedDepthMm;
  const useful = Math.max(0, boxDepthMm - boxThicknessMm - 20);
  return selectHettichRunnerDepth(useful);
}

/** Seleção canónica Modelo B a partir da caixa. */
export function pickHettichRunnerForBox(box: EuropeanDrawerBoxInput): number {
  return selectHettichRunnerDepth(resolveEuropeanUsefulInternalDepthMm(box));
}
