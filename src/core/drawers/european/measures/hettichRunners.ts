/**
 * Corrediças Hettich — comprimentos industriais permitidos (Modelo B).
 */

/** Comprimentos Hettich válidos (mm). */
export const HETTICH_RUNNER_LENGTHS_MM = [300, 350, 400, 450, 500, 550, 600] as const;

export type HettichRunnerLengthMm = (typeof HETTICH_RUNNER_LENGTHS_MM)[number];

/**
 * Seleciona o comprimento de corrediça Hettich válido mais próximo
 * abaixo da profundidade útil interna (sempre STRICTLY menor).
 *
 * Exemplos:
 * - 500 mm ? 450 mm
 * - 380 mm ? 350 mm
 */
export function selectHettichRunnerDepth(internalDepthMm: number): HettichRunnerLengthMm {
  const useful = Number(internalDepthMm);
  if (!Number.isFinite(useful) || useful <= 0) {
    return HETTICH_RUNNER_LENGTHS_MM[0];
  }
  const fitting = HETTICH_RUNNER_LENGTHS_MM.filter((length) => length < useful);
  if (fitting.length === 0) {
    return HETTICH_RUNNER_LENGTHS_MM[0];
  }
  return fitting[fitting.length - 1]!;
}

export function isHettichRunnerLengthMm(value: number): value is HettichRunnerLengthMm {
  return (HETTICH_RUNNER_LENGTHS_MM as readonly number[]).includes(value);
}
