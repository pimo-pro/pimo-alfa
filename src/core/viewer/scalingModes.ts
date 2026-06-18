export type ScalingMode = "additive" | "ratio";

/** Escala valores numéricos positivos segundo o modo indicado. */
export function scaleDimensionValues(
  values: number[],
  newMaxLength: number,
  mode: ScalingMode
): number[] {
  const finite = values.filter((v) => Number.isFinite(v) && v > 0);
  if (finite.length === 0 || !Number.isFinite(newMaxLength) || newMaxLength <= 0) {
    return values;
  }
  const oldMax = Math.max(...finite);
  if (oldMax <= 0) return values;

  if (mode === "ratio") {
    const ratio = newMaxLength / oldMax;
    return values.map((v) => (Number.isFinite(v) && v > 0 ? Math.max(1, v * ratio) : v));
  }

  const delta = newMaxLength - oldMax;
  return values.map((v) => (Number.isFinite(v) && v > 0 ? Math.max(1, v + delta) : v));
}

/** Maior comprimento entre listas de dimensões. */
export function maxLengthAcross(...dimensionLists: number[][]): number {
  let max = 0;
  for (const list of dimensionLists) {
    for (const v of list) {
      if (Number.isFinite(v) && v > max) max = v;
    }
  }
  return max;
}
