/**
 * safeNumbers.ts — Proteção numérica transparente (Modelo B).
 * Não altera fórmulas; apenas impede NaN/Infinity/negativos na emissóo.
 */

export type RobustDebugEntry = {
  at: number;
  context: string;
  message: string;
  value?: unknown;
};

const DEBUG_RING: RobustDebugEntry[] = [];
const DEBUG_RING_MAX = 200;

function isDebugEnabled(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem("pimo_eu_robust_debug") === "1";
  } catch {
    return false;
  }
}

/** Registo interno (debug); nunca lança. */
export function robustDebug(context: string, message: string, value?: unknown): void {
  const entry: RobustDebugEntry = { at: Date.now(), context, message, value };
  DEBUG_RING.push(entry);
  if (DEBUG_RING.length > DEBUG_RING_MAX) DEBUG_RING.shift();
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.debug(`[eu-robust] ${context}: ${message}`, value);
  }
}

export function getRobustDebugLog(): readonly RobustDebugEntry[] {
  return DEBUG_RING;
}

export function clearRobustDebugLog(): void {
  DEBUG_RING.length = 0;
}

/** Garante número finito; fallback default (0). */
export function ensureFiniteNumber(
  value: unknown,
  context: string,
  fallback = 0
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(n)) return n;
  robustDebug(context, `valor não finito ? ${fallback}`, value);
  return fallback;
}

/** Garante ? 0 (clamp). */
export function ensureNonNegative(value: unknown, context: string): number {
  const n = ensureFiniteNumber(value, context, 0);
  if (n >= 0) return n;
  robustDebug(context, `negativo ? 0`, value);
  return 0;
}

/**
 * Garante dimensóo crítica > 0.
 * Se inválido ? fallback (default 1 mm) para não quebrar pipeline.
 */
export function ensureDimensionPositive(
  value: unknown,
  context: string,
  fallback = 1
): number {
  const n = ensureFiniteNumber(value, context, fallback);
  if (n > 0) return n;
  robustDebug(context, `dimensóo ? 0 ? ${fallback}`, value);
  return fallback;
}

/** Garante array (nunca null/undefined). */
export function ensureArray<T>(value: T[] | null | undefined, context?: string): T[] {
  if (Array.isArray(value)) return value;
  if (context) robustDebug(context, "valor não-array ? []", value);
  return [];
}

export function isFinitePositive(value: unknown): boolean {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0;
}

export function isFiniteNonNegative(value: unknown): boolean {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0;
}
