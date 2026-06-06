import { getIndustrialMetrics } from '@/industrial/core/metrics/actions';
import { listTasks } from '@/industrial/core/tasks/actions';
import { listWorkOrders } from '@/industrial/core/work-orders/actions';
import type { IndustrialDashboardData } from './types';

export async function getDashboardData(): Promise<IndustrialDashboardData> {
  const [metrics, recentWorkOrders, recentTasks] = await Promise.all([
    getIndustrialMetrics(),
    listWorkOrders({ limit: 10 }),
    listTasks({ limit: 10 }),
  ]);

  return {
    metrics,
    recentWorkOrders,
    recentTasks,
    generatedAt: new Date().toISOString(),
  };
}
