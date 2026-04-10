import { devLogger } from "./devLogger";

/**
 * Mede duração de uma operação assíncrona; em DEV regista um único resumo (sem spam por peça/sheet).
 */
export async function measureTime<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  try {
    return await fn();
  } finally {
    const t1 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    if (import.meta.env.DEV) {
      devLogger.info(`[perf] ${label}: ${(t1 - t0).toFixed(1)}ms`);
    }
  }
}
