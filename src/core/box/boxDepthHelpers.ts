/**
 * FASE 2 — Helpers de leitura da profundidade útil (mm), sem alterar fabrico/viewer.
 */

import {
  buildBoxProfundidadeAlvoEntrada,
  computeBoxProfundidadeAlvoResultado,
  type BoxLikeParaProfundidadeAlvo,
} from "./boxDepthModel";

/** Profundidade útil interna (mm) segundo o modelo alvo FASE 1. */
export function getProfundidadeInternaUtilMm(
  box: BoxLikeParaProfundidadeAlvo,
  espessuraCostaRegrasMm: number | undefined
): number {
  const entrada = buildBoxProfundidadeAlvoEntrada(box, espessuraCostaRegrasMm);
  return computeBoxProfundidadeAlvoResultado(entrada).profundidadeInternaUtilMm;
}
