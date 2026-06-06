import { getTasksByWorkOrder } from '@/industrial/core/tasks/actions';
import { getWorkOrderById } from '@/industrial/core/work-orders/actions';
import type { TrackingSnapshot } from './types';

export async function getWorkOrderTracking(workOrderId: string): Promise<TrackingSnapshot | null> {
  const workOrder = await getWorkOrderById(workOrderId);
  if (!workOrder) return null;

  const tasks = await getTasksByWorkOrder(workOrderId);
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const totalTasks = tasks.length;

  return {
    workOrderId,
    status: workOrder.status,
    totalTasks,
    completedTasks,
    progress: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    updatedAt: workOrder.updated_at,
  };
}
