/**
 * Regras industriais de profundidade de corrediças de gaveta.
 * Comprimentos permitidos: 350–600 mm (passo de 50 mm).
 */

import { SYSTEM_BACK_MM } from "../baseCabinets";

/** Comprimentos industriais de corrediça (mm) — únicos valores permitidos. */
export const DRAWER_SLIDE_LENGTHS_MM = [350, 400, 450, 500, 550, 600] as const;

export type DrawerSlideLengthMm = (typeof DRAWER_SLIDE_LENGTHS_MM)[number];

/**
 * Profundidade útil para seleção de corrediça:
 * profundidade_externa − costa (se ativa) − espessura_frente − folgas traseiras.
 * Mesma base que portas: P − costa − frente, menos recuo de corrediça.
 */
export function resolveDrawerUsableDepthMm(
  depthExternalMm: number,
  frontThicknessMm: number,
  clearanceMm: number,
  options?: { espessuraCostaMm?: number; costaAtiva?: boolean }
): number {
  const external = Number(depthExternalMm);
  const front = Number(frontThicknessMm);
  const clearance = Number(clearanceMm);
  if (!Number.isFinite(external) || external <= 0) return 0;
  const costaAtiva = options?.costaAtiva !== false;
  const costa =
    costaAtiva && Number.isFinite(Number(options?.espessuraCostaMm)) && Number(options?.espessuraCostaMm) > 0
      ? Number(options!.espessuraCostaMm)
      : costaAtiva
        ? 10
        : 0;
  const subtract =
    costa +
    (Number.isFinite(front) && front > 0 ? front : 0) +
    (Number.isFinite(clearance) && clearance > 0 ? clearance : 0);
  return Math.max(0, external - subtract);
}

/**
 * Saliência da face exterior da frente face à profundidade externa do módulo (mm).
 * Regra de produto: frente = profundidade_externa + 1 mm.
 */
export const DRAWER_FRONT_FACE_OVERHANG_MM = 1;

/** Face frontal exterior da frente (mm, origem no centro da caixa). */
export function resolveDrawerFrontOuterZMm(
  profundidadeExternaMm: number,
  overhangMm: number = DRAWER_FRONT_FACE_OVERHANG_MM
): number {
  const overhang = Number.isFinite(Number(overhangMm)) ? Number(overhangMm) : 0;
  return Math.max(0, Number(profundidadeExternaMm)) / 2 + overhang;
}

/**
 * Centro Z da frente da gaveta: 1 mm à frente da face externa do módulo.
 * frontPosZ = (profundidadeExterna / 2) + overhang − (espessuraFrente / 2)
 */
export function resolveDrawerFrontPosZMm(
  profundidadeExternaMm: number,
  frontThicknessMm: number,
  overhangMm: number = DRAWER_FRONT_FACE_OVERHANG_MM
): number {
  const frontT = Math.max(0, Number(frontThicknessMm));
  return resolveDrawerFrontOuterZMm(profundidadeExternaMm, overhangMm) - frontT / 2;
}

/**
 * Profundidade do corpo da gaveta no viewer (mm).
 * bodyDepthMm = profundidadeUtilMm − folgaCorredicaMm
 */
export function resolveDrawerViewerBodyDepthMm(
  profundidadeUtilMm: number,
  folgaCorredicaMm: number
): number {
  const util = Math.max(0, Number(profundidadeUtilMm));
  const folga = Math.max(0, Number(folgaCorredicaMm));
  return Math.max(0, util - folga);
}

/** Centro Z absoluto do corpo (mm, origem no centro da caixa). */
export function resolveDrawerBodyCenterZFromFrontMm(
  frontPosZMm: number,
  frontThicknessMm: number,
  bodyDepthMm: number
): number {
  const frontT = Math.max(0, Number(frontThicknessMm));
  const bodyDepth = Math.max(0, Number(bodyDepthMm));
  return Number(frontPosZMm) - frontT / 2 - bodyDepth / 2;
}

/**
 * Reconstitui P externa a partir da P útil interna (modelo boxDepthModel).
 * profundidadeExterna = profundidadeUtil + espessuraFrente + espessuraCosta (se ativa)
 */
export function resolveProfundidadeExternaFromUtilMm(
  profundidadeUtilMm: number,
  frontThicknessMm: number,
  backThicknessMm: number = SYSTEM_BACK_MM,
  costaAtiva: boolean = true
): number {
  const util = Math.max(0, Number(profundidadeUtilMm));
  const front = Math.max(0, Number(frontThicknessMm));
  const back =
    costaAtiva && Number.isFinite(Number(backThicknessMm)) && Number(backThicknessMm) > 0
      ? Number(backThicknessMm)
      : 0;
  return util + front + back;
}

/**
 * Maior comprimento de corrediça da lista industrial que cabe na profundidade útil.
 */
export function resolveDrawerSlideLength(usableDepthMm: number): DrawerSlideLengthMm {
  const usable = Number(usableDepthMm);
  if (!Number.isFinite(usable) || usable <= 0) {
    return DRAWER_SLIDE_LENGTHS_MM[0];
  }
  const fitting = DRAWER_SLIDE_LENGTHS_MM.filter((length) => length <= usable);
  return fitting.length > 0 ? fitting[fitting.length - 1]! : DRAWER_SLIDE_LENGTHS_MM[0];
}

export function isDrawerSlideLengthMm(value: number): value is DrawerSlideLengthMm {
  return (DRAWER_SLIDE_LENGTHS_MM as readonly number[]).includes(value);
}

/** Folga traseira das laterais face ao comprimento nominal da corrediça (mm). */
export const DRAWER_SIDE_DEPTH_SLIDE_CLEARANCE_MM = 10;

/**
 * Comprimento industrial das laterais/costa ao longo da corrediça.
 * Redução aplicada na traseira; a frente da gaveta permanece alinhada.
 */
export function resolveDrawerSideDepthMm(slideLengthMm: number): number {
  const slide = Math.max(0, Number(slideLengthMm));
  return Math.max(0, slide - DRAWER_SIDE_DEPTH_SLIDE_CLEARANCE_MM);
}
