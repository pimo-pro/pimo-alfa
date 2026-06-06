export function percent(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

export function roundMetric(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
