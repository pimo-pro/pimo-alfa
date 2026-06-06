import { getIndustrialMetrics } from '@/industrial/core/metrics/actions';
import type { IndustrialMetrics } from '@/industrial/core/metrics/types';

export interface AnalyticsStats extends IndustrialMetrics {
  generatedAt: string;
}

/**
 * Calcula estatisticas agregadas sem chamar a si propria.
 * Isto corrige a recursao observada no legado em `analytics/stats.ts`.
 */
export async function getAnalyticsStats(): Promise<AnalyticsStats> {
  const metrics = await getIndustrialMetrics();
  return {
    ...metrics,
    generatedAt: new Date().toISOString(),
  };
}
