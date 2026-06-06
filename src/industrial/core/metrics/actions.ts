import { listTasks } from '@/industrial/core/tasks/actions';
import { listWorkOrders } from '@/industrial/core/work-orders/actions';
import { analyticsCache } from '@/industrial/infra/cache';
import type { IndustrialMetrics } from './types';

export async function getIndustrialMetrics(): Promise<IndustrialMetrics> {
  const cached = analyticsCache.get<IndustrialMetrics>('industrial-metrics');
  if (cached) return cached;

  const [workOrders, tasks] = await Promise.all([listWorkOrders({ limit: 1000 }), listTasks({ limit: 1000 })]);
  const completedWorkOrders = workOrders.filter((order) => order.status === 'completed').length;
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;

  const metrics: IndustrialMetrics = {
    totalWorkOrders: workOrders.length,
    openWorkOrders: workOrders.filter((order) => order.status !== 'completed' && order.status !== 'cancelled').length,
    completedWorkOrders,
    totalTasks: tasks.length,
    completedTasks,
    completionRate: tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0,
  };

  analyticsCache.set('industrial-metrics', metrics);
  return metrics;
}
