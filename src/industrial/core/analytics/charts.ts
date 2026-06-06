import type { AnalyticsStats } from './stats';

export interface ChartPoint {
  label: string;
  value: number;
}

export function buildCompletionChart(stats: AnalyticsStats): ChartPoint[] {
  return [
    { label: 'Concluidas', value: stats.completedTasks },
    { label: 'Pendentes', value: Math.max(0, stats.totalTasks - stats.completedTasks) },
  ];
}
