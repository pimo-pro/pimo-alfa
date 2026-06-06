import { logEvent } from '@/industrial/core/events/actions';
import { workflowEngine } from '@/industrial/core/workflow-engine/engine';
import { WORKFLOW_ENTITY_TYPES } from '@/industrial/core/workflow-engine/types';
import { supabase } from '@/industrial/infra/db';
import { dbCache } from '@/industrial/infra/cache';
import { INDUSTRIAL_TABLES } from '@/industrial/infra/supabase/tables';
import type { CreateWorkOrderDto, UpdateWorkOrderDto, WorkOrder, WorkOrderFilter } from './types';

export async function listWorkOrders(filter: WorkOrderFilter = {}): Promise<WorkOrder[]> {
  const cacheKey = `work-orders:${JSON.stringify(filter)}`;
  const cached = dbCache.get<WorkOrder[]>(cacheKey);
  if (cached) return cached;

  let query = supabase.from(INDUSTRIAL_TABLES.workOrders).select('*');
  if (filter.status) query = query.eq('status', filter.status);
  if (filter.department_id) query = query.eq('department_id', filter.department_id);
  if (filter.assigned_to) query = query.eq('assigned_to', filter.assigned_to);
  if (filter.created_by) query = query.eq('created_by', filter.created_by);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(filter.offset ?? 0, (filter.offset ?? 0) + (filter.limit ?? 50) - 1);

  if (error) {
    console.error('Erro ao listar ordens de trabalho:', error);
    return [];
  }

  const workOrders = (data ?? []) as WorkOrder[];
  dbCache.set(cacheKey, workOrders);
  return workOrders;
}

export async function getWorkOrderById(id: string): Promise<WorkOrder | null> {
  const cached = dbCache.get<WorkOrder>(`work-order:${id}`);
  if (cached) return cached;

  const { data, error } = await supabase.from(INDUSTRIAL_TABLES.workOrders).select('*').eq('id', id).single();
  if (error) {
    console.error('Erro ao obter ordem de trabalho:', error);
    return null;
  }

  dbCache.set(`work-order:${id}`, data);
  return data as WorkOrder;
}

export async function createWorkOrder(input: CreateWorkOrderDto): Promise<WorkOrder | null> {
  const { data, error } = await supabase
    .from(INDUSTRIAL_TABLES.workOrders)
    .insert({
      ...input,
      status: 'draft',
      priority: input.priority ?? 'medium',
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar ordem de trabalho:', error);
    return null;
  }

  const workOrder = data as WorkOrder;
  dbCache.invalidate('work-orders');
  await logEvent('work_order_created', { work_order_id: workOrder.id, user_id: workOrder.created_by ?? undefined });
  await workflowEngine.evaluateWorkflow(
    { ...workOrder, entity_type: WORKFLOW_ENTITY_TYPES.workOrder },
    { type: 'work_order_created' },
    { user_id: workOrder.created_by ?? undefined },
  );
  return workOrder;
}

export async function updateWorkOrder(id: string, input: UpdateWorkOrderDto): Promise<WorkOrder | null> {
  const { data, error } = await supabase
    .from(INDUSTRIAL_TABLES.workOrders)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar ordem de trabalho:', error);
    return null;
  }

  const workOrder = data as WorkOrder;
  dbCache.invalidate('work-orders');
  dbCache.delete(`work-order:${id}`);
  await logEvent('work_order_status_changed', { work_order_id: id, metadata: { status: input.status } });
  await workflowEngine.evaluateWorkflow(
    { ...workOrder, entity_type: WORKFLOW_ENTITY_TYPES.workOrder },
    { type: 'work_order_updated' },
  );
  return workOrder;
}

export async function deleteWorkOrder(id: string): Promise<boolean> {
  const { error } = await supabase.from(INDUSTRIAL_TABLES.workOrders).delete().eq('id', id);
  if (error) {
    console.error('Erro ao apagar ordem de trabalho:', error);
    return false;
  }

  dbCache.invalidate('work-orders');
  dbCache.delete(`work-order:${id}`);
  await logEvent('work_order_deleted', { work_order_id: id });
  return true;
}
