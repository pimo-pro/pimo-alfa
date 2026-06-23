import type { TrackingSnapshot } from '../core/tracking/types';

/** Função pura — progresso WO a partir de tarefas (Fase 6 strict + testes). */
export function buildTrackingSnapshot(
  workOrderId: string,
  status: string,
  tasks: Array<{ status: string }>,
  updatedAt: string,
): TrackingSnapshot {
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const totalTasks = tasks.length;
  return {
    workOrderId,
    status,
    totalTasks,
    completedTasks,
    progress: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    updatedAt,
  };
}
