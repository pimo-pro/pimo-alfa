/**
 * Lookup local NL → b1 (Hettich Quadro V6 YOU M).
 * Distância real do furo intermédio à face = 38 + b1.
 * Não altera IDs canónicos nem o pipeline industrial.
 */

/** Tabela oficial Hettich Quadro V6 — b1 por comprimento nominal (mm). */
export const HETTICH_QUADRO_V6_B1_BY_NL_MM = {
  250: 142,
  300: 192,
  350: 192,
  400: 224,
  450: 256,
  500: 288,
} as const;

export type HettichQuadroV6B1NlMm = keyof typeof HETTICH_QUADRO_V6_B1_BY_NL_MM;

/**
 * TODO: NL 550 e 600 — sem b1 oficial confirmado nesta fase.
 * Não inventar valores; o consumidor deve usar fallback controlado.
 */
export const HETTICH_QUADRO_V6_B1_UNSUPPORTED_NL_MM = [550, 600] as const;

export type HettichQuadroV6UnsupportedNlMm =
  (typeof HETTICH_QUADRO_V6_B1_UNSUPPORTED_NL_MM)[number];

export function isQuadroV6B1UnsupportedNl(nl: number): boolean {
  return (HETTICH_QUADRO_V6_B1_UNSUPPORTED_NL_MM as readonly number[]).includes(nl);
}

/**
 * Devolve b1 oficial para o NL, ou `null` se não houver valor confirmado
 * (inclui 550/600 e qualquer NL fora da tabela).
 */
export function lookupQuadroV6B1Mm(nl: number): number | null {
  if (!Number.isFinite(nl)) return null;
  if (isQuadroV6B1UnsupportedNl(nl)) return null;
  const key = nl as HettichQuadroV6B1NlMm;
  const b1 = HETTICH_QUADRO_V6_B1_BY_NL_MM[key];
  return typeof b1 === "number" && Number.isFinite(b1) ? b1 : null;
}

/** Distância real do intermédio à face (frente ou traseira): 38 + b1. */
export function quadroV6IntermediateDistanceFromFaceMm(
  b1Mm: number,
  edgeSetbackMm: number
): number {
  return edgeSetbackMm + b1Mm;
}
