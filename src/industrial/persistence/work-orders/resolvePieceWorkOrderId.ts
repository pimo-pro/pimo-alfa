import type { IndustrialWorkOrderTask } from '@/industrial/work-orders/types';

import { loadTasksByPiece } from './loadWorkOrders';
import { validateWorkOrderId } from './validateWorkOrderId';

/** Resolve `work_order_id` validado a partir de tarefas da view (preferir task da operação). */
export async function resolveValidatedWorkOrderIdFromTasks(
  tasks: IndustrialWorkOrderTask[],
  operationType?: string,
): Promise<string | null> {
  if (tasks.length === 0) return null;

  const stationMatch = operationType
    ? tasks.find(
        (task) =>
          task.operationType === operationType ||
          task.operationType.includes(operationType),
      )
    : undefined;
  const task = stationMatch ?? tasks[0];
  if (!task?.workOrderId) return null;

  return validateWorkOrderId(task.workOrderId, `task=${task.id}:piece=${task.pieceId}`);
}

export async function resolveValidatedWorkOrderIdForPiece(
  pieceId: string,
  operationType?: string,
): Promise<string | null> {
  const tasks = await loadTasksByPiece(pieceId);
  return resolveValidatedWorkOrderIdFromTasks(tasks, operationType);
}
