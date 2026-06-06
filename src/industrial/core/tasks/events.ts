import type { IndustrialTask } from './types';

export interface TaskStatusChangedEvent {
  type: 'task_status_changed' | 'task_completed';
  task_id: string;
  work_order_id?: string | null;
  previous_status?: string | null;
  current_status: string;
}

export function createTaskStatusChangedEvent(
  task: IndustrialTask,
  previousStatus?: string | null,
): TaskStatusChangedEvent {
  return {
    type: task.status === 'completed' ? 'task_completed' : 'task_status_changed',
    task_id: task.id,
    work_order_id: task.work_order_id,
    previous_status: previousStatus,
    current_status: task.status,
  };
}
