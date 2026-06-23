import type { TrackingSnapshot } from '../core/tracking/types';
import { loadTasksByPiece } from '../persistence/work-orders/loadWorkOrders';

import { getWorkOrderTrackingUnified } from './getWorkOrderTrackingUnified';

function deriveStatusFromTasks(
  tasks: Array<{ status: string }>,
): TrackingSnapshot['status'] {
  if (tasks.length === 0) return 'pending';
  if (tasks.every((task) => task.status === 'completed')) return 'completed';
  if (tasks.some((task) => task.status === 'in_progress')) return 'in_progress';
  if (tasks.some((task) => task.status === 'rejected')) return 'in_progress';
  return 'pending';
}

/**
 * Progresso da peça para PIMO-TRAK.
 * 1. WO explícito no snapshot → tracking unificado (industrial → legado)
 * 2. Sem WO → agrega `industrial_work_order_tasks` por `piece_id`
 */
export async function resolvePieceTracking(
  pieceId: string,
  workOrderId?: string | null,
): Promise<TrackingSnapshot | null> {
  if (workOrderId) {
    return getWorkOrderTrackingUnified(workOrderId);
  }

  const tasks = await loadTasksByPiece(pieceId).catch(() => []);
  if (tasks.length === 0) return null;

  const first = tasks[0]!;
  let updatedAt = first.updatedAt;
  for (const task of tasks) {
    if (task.updatedAt > updatedAt) updatedAt = task.updatedAt;
  }

  const completedTasks = tasks.filter((task) => task.status === 'completed').length;

  return {
    workOrderId: first.workOrderId ?? pieceId,
    status: deriveStatusFromTasks(tasks),
    totalTasks: tasks.length,
    completedTasks,
    progress: tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0,
    updatedAt,
  };
}
