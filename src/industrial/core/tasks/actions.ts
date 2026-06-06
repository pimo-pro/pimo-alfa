import { logEvent } from '@/industrial/core/events/actions';
import { workflowEngine } from '@/industrial/core/workflow-engine/engine';
import { WORKFLOW_ENTITY_TYPES } from '@/industrial/core/workflow-engine/types';
import { dbCache } from '@/industrial/infra/cache';
import { supabase } from '@/industrial/infra/db';
import { INDUSTRIAL_TABLES } from '@/industrial/infra/supabase/tables';
import type {
  CreateIndustrialTaskDto,
  IndustrialTask,
  IndustrialTaskFilter,
  UpdateIndustrialTaskDto,
} from './types';

export async function listTasks(filter: IndustrialTaskFilter = {}): Promise<IndustrialTask[]> {
  const cacheKey = `tasks:${JSON.stringify(filter)}`;
  const cached = dbCache.get<IndustrialTask[]>(cacheKey);
  if (cached) return cached;

  let query = supabase.from(INDUSTRIAL_TABLES.workOrderTasks).select('*');
  if (filter.work_order_id) query = query.eq('work_order_id', filter.work_order_id);
  if (filter.status) query = query.eq('status', filter.status);
  if (filter.department_id) query = query.eq('department_id', filter.department_id);
  if (filter.assigned_to) query = query.eq('assigned_to', filter.assigned_to);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(filter.offset ?? 0, (filter.offset ?? 0) + (filter.limit ?? 50) - 1);

  if (error) {
    console.error('Erro ao listar tarefas industriais:', error);
    return [];
  }

  const tasks = (data ?? []) as IndustrialTask[];
  dbCache.set(cacheKey, tasks);
  return tasks;
}

export async function createTask(input: CreateIndustrialTaskDto): Promise<IndustrialTask | null> {
  const { data, error } = await supabase
    .from(INDUSTRIAL_TABLES.workOrderTasks)
    .insert({
      ...input,
      status: 'pending',
      priority: input.priority ?? 'medium',
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar tarefa industrial:', error);
    return null;
  }

  const task = data as IndustrialTask;
  dbCache.invalidate('tasks');
  await logEvent('task_created', { task_id: task.id, work_order_id: task.work_order_id ?? undefined });
  await workflowEngine.evaluateWorkflow({ ...task, entity_type: WORKFLOW_ENTITY_TYPES.task }, { type: 'task_created' });
  return task;
}

export async function updateTask(id: string, input: UpdateIndustrialTaskDto): Promise<IndustrialTask | null> {
  const completedAt =
    input.status === 'completed' && input.completed_at === undefined ? new Date().toISOString() : input.completed_at;
  const { data, error } = await supabase
    .from(INDUSTRIAL_TABLES.workOrderTasks)
    .update({ ...input, completed_at: completedAt, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar tarefa industrial:', error);
    return null;
  }

  const task = data as IndustrialTask;
  dbCache.invalidate('tasks');
  await logEvent(input.status === 'completed' ? 'task_completed' : 'task_status_changed', {
    task_id: id,
    work_order_id: task.work_order_id ?? undefined,
    metadata: { status: input.status },
  });
  await workflowEngine.evaluateWorkflow({ ...task, entity_type: WORKFLOW_ENTITY_TYPES.task }, { type: 'task_updated' });
  return task;
}

export async function deleteTask(id: string): Promise<boolean> {
  const { error } = await supabase.from(INDUSTRIAL_TABLES.workOrderTasks).delete().eq('id', id);
  if (error) {
    console.error('Erro ao apagar tarefa industrial:', error);
    return false;
  }

  dbCache.invalidate('tasks');
  await logEvent('task_deleted', { task_id: id });
  return true;
}

export async function getTasksByWorkOrder(workOrderId: string): Promise<IndustrialTask[]> {
  return listTasks({ work_order_id: workOrderId, limit: 500 });
}
