export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  ttl: number;
  hits: number;
  namespace: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  totalEntries: number;
  memoryUsage: number;
  hitRate: number;
}

export interface CacheSetOptions {
  ttl?: number;
  namespace?: string;
}

class CacheManager {
  private cache = new Map<string, CacheEntry<unknown>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalEntries: 0,
    memoryUsage: 0,
    hitRate: 0,
  };
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private defaultTTL = 5 * 60 * 1000;

  constructor() {
    this.startCleanup();
  }

  set<T>(key: string, value: T, options: CacheSetOptions = {}): void {
    const { ttl = this.defaultTTL, namespace = 'default' } = options;

    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      ttl,
      hits: 0,
      namespace,
    });
    this.updateStats();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses += 1;
      this.updateHitRate();
      return null;
    }

    if (Date.now() - entry.createdAt > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses += 1;
      this.updateHitRate();
      return null;
    }

    entry.hits += 1;
    this.stats.hits += 1;
    this.updateHitRate();
    return entry.value as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.updateStats();
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.updateStats();
  }

  clearNamespace(namespace: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.namespace === namespace) {
        this.cache.delete(key);
      }
    }
    this.updateStats();
  }

  invalidate(pattern: string): number {
    const regex = new RegExp(pattern);
    let invalidated = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated += 1;
      }
    }

    this.updateStats();
    return invalidated;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getKeys(namespace?: string): string[] {
    if (!namespace) return Array.from(this.cache.keys());

    return Array.from(this.cache.entries())
      .filter(([, entry]) => entry.namespace === namespace)
      .map(([key]) => key);
  }

  getMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2;
      totalSize += JSON.stringify(entry.value).length * 2;
    }

    return totalSize;
  }

  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.createdAt > entry.ttl) {
        this.cache.delete(key);
        cleaned += 1;
      }
    }

    if (cleaned > 0) this.updateStats();
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  export(): string {
    return JSON.stringify(Object.fromEntries(this.cache.entries()));
  }

  import(data: string): void {
    try {
      const parsed = JSON.parse(data) as Record<string, CacheEntry<unknown>>;
      for (const [key, entry] of Object.entries(parsed)) {
        this.cache.set(key, entry);
      }
      this.updateStats();
    } catch (error) {
      console.error('Erro ao importar cache industrial:', error);
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  private updateStats(): void {
    this.stats.totalEntries = this.cache.size;
    this.stats.memoryUsage = this.getMemoryUsage();
    this.updateHitRate();
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
}

export const cache = new CacheManager();

function namespacedCache(namespace: string) {
  return {
    set: <T>(key: string, value: T, ttl?: number) => cache.set(`${namespace}:${key}`, value, { ttl, namespace }),
    get: <T>(key: string): T | null => cache.get<T>(`${namespace}:${key}`),
    delete: (key: string): boolean => cache.delete(`${namespace}:${key}`),
    invalidate: () => cache.clearNamespace(namespace),
  };
}

export const analyticsCache = namespacedCache('analytics');
export const notificationsCache = namespacedCache('notifications');
export const workflowCache = namespacedCache('workflow');
export const dbCache = {
  ...namespacedCache('database'),
  invalidate: (pattern?: string) => (pattern ? cache.invalidate(`db:${pattern}`) : cache.clearNamespace('database')),
};

export function memoize<TArgs extends readonly unknown[], TResult>(
  fn: (..._args: TArgs) => TResult,
  options: {
    ttl?: number;
    keyGenerator?: (..._args: TArgs) => string;
    namespace?: string;
  } = {},
): (..._args: TArgs) => TResult {
  const { ttl = 5 * 60 * 1000, keyGenerator, namespace = 'memoize' } = options;

  return (...args: TArgs) => {
    const key = keyGenerator ? keyGenerator(...args) : `${fn.name}:${JSON.stringify(args)}`;
    const cached = cache.get<TResult>(key);
    if (cached !== null) return cached;

    const result = fn(...args);
    cache.set(key, result, { ttl, namespace });
    return result;
  };
}

export function invalidateEventCaches(): void {
  cache.invalidate('analytics');
  cache.invalidate('notifications');
  cache.invalidate('workflow');
  cache.invalidate('db');
}

export default cache;
