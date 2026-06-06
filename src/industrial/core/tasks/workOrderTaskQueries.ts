import type { IndustrialTask } from './types';

export function groupTasksByWorkOrder(tasks: IndustrialTask[]): Record<string, IndustrialTask[]> {
  return tasks.reduce<Record<string, IndustrialTask[]>>((groups, task) => {
    const key = task.work_order_id ?? 'unassigned';
    groups[key] ??= [];
    groups[key].push(task);
    return groups;
  }, {});
}

export function getTaskCompletionRate(tasks: IndustrialTask[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((task) => task.status === 'completed').length;
  return (completed / tasks.length) * 100;
}
