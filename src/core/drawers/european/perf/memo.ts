/**
 * perf/memo.ts — Memoização segura para funções puras do Modelo B.
 * Cache por JSON.stringify(args); LRU; limpeza por epoch de config.
 * Nunca usar em UI/layers com side-effects.
 */

export type MemoOptions = {
  /** Capacidade máxima de entradas (default 256). */
  maxSize?: number;
  /** Namespace para limpeza selectiva. */
  namespace?: string;
};

type CacheEntry = { value: unknown; touched: number };

const globalCaches = new Map<string, Map<string, CacheEntry>>();
let configEpoch = 0;
let touchSeq = 0;

/** Incrementa epoch global (invalidação quando config estrutural muda). */
export function bumpEuropeanPerfConfigEpoch(): number {
  configEpoch += 1;
  clearAllEuropeanMemos();
  return configEpoch;
}

export function getEuropeanPerfConfigEpoch(): number {
  return configEpoch;
}

export function clearAllEuropeanMemos(): void {
  for (const cache of globalCaches.values()) cache.clear();
}

export function clearEuropeanMemoNamespace(namespace: string): void {
  globalCaches.get(namespace)?.clear();
}

function getCache(namespace: string): Map<string, CacheEntry> {
  let cache = globalCaches.get(namespace);
  if (!cache) {
    cache = new Map();
    globalCaches.set(namespace, cache);
  }
  return cache;
}

function stableKey(args: unknown[]): string {
  try {
    return `${configEpoch}::${JSON.stringify(args)}`;
  } catch {
    // Fallback raro (args não serializáveis): não cachear de forma partilhada
    return `${configEpoch}::${String(args.length)}::${Date.now()}::${Math.random()}`;
  }
}

function evictIfNeeded(cache: Map<string, CacheEntry>, maxSize: number): void {
  if (cache.size <= maxSize) return;
  // Remover entradas menos recentemente tocadas
  const entries = [...cache.entries()].sort((a, b) => a[1].touched - b[1].touched);
  const removeCount = Math.max(1, cache.size - maxSize);
  for (let i = 0; i < removeCount; i++) {
    cache.delete(entries[i]![0]);
  }
}

/**
 * Memoiza função pura. Chave = epoch + JSON.stringify(args).
 */
export function memo<TArgs extends unknown[], TResult>(
  fn: (..._args: TArgs) => TResult,
  options?: MemoOptions
): (..._args: TArgs) => TResult {
  const namespace = options?.namespace ?? (fn.name || "anon");
  const maxSize = Math.max(8, options?.maxSize ?? 256);
  const cache = getCache(namespace);

  return (...args: TArgs): TResult => {
    const key = stableKey(args as unknown[]);
    // Se a chave contém random (fallback), não usar cache
    if (key.includes("::") && key.split("::").length > 2 && /[0-9]+\.[0-9]+$/.test(key)) {
      return fn(...args);
    }
    const hit = cache.get(key);
    if (hit) {
      hit.touched = ++touchSeq;
      return hit.value as TResult;
    }
    const value = fn(...args);
    cache.set(key, { value, touched: ++touchSeq });
    evictIfNeeded(cache, maxSize);
    return value;
  };
}
