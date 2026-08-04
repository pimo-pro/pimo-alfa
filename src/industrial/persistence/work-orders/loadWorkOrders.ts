import { supabase } from '@/industrial/infra/db';
import {
  attachDisplayToTasks,
} from '@/industrial/work-orders/resolveWorkOrderPiece';
import type { IndustrialStation, IndustrialWorkOrder } from '@/industrial/work-orders/types';

import { mapTaskRow, mapTaskViewRow, mapWorkOrderRow } from './mappers';
import { INDUSTRIAL_VIEW_TABLES, WORK_ORDER_TABLES } from './tables';
import type { IndustrialWorkOrderTask } from '@/industrial/work-orders/types';

export interface WorkOrderFilters {
  projectId?: string;
  projectCode?: string;
  station?: IndustrialStation;
  status?: string;
  /**
   * Se true, inclui ordens com status `cancelled`.
   * Default false — filas de estação/operador não mostram canceladas.
   */
  includeCancelled?: boolean;
}

function projectIdMapFromOrders(orders: IndustrialWorkOrder[]): Map<string, string> {
  return new Map(orders.map((order) => [order.id, order.projectId]));
}

function enrichTasks(tasks: IndustrialWorkOrderTask[], orders: IndustrialWorkOrder[]): IndustrialWorkOrderTask[] {
  const projectMap = projectIdMapFromOrders(orders);
  return attachDisplayToTasks(tasks, projectMap);
}

/** Exclui tarefas cujo `work_order_id` não existe em `industrial_work_orders`. */
async function filterTasksWithExistingOrders(
  tasks: IndustrialWorkOrderTask[],
): Promise<IndustrialWorkOrderTask[]> {
  if (tasks.length === 0) return [];

  const orderIds = Array.from(new Set(tasks.map((task) => task.workOrderId).filter(Boolean)));
  if (orderIds.length === 0) return [];

  const { data, error } = await supabase
    .from(WORK_ORDER_TABLES.orders)
    .select('id, status')
    .in('id', orderIds);

  if (error) throw new Error(error.message);

  const validIds = new Set(
    (data ?? [])
      .filter((row) => String(row.status) !== 'cancelled')
      .map((row) => row.id as string),
  );
  const filtered = tasks.filter((task) => validIds.has(task.workOrderId));

  if (filtered.length < tasks.length) {
    const dropped = tasks.length - filtered.length;
    console.warn(
      `[industrial] ${dropped} tarefa(s) ignorada(s) — work_order_id inexistente em industrial_work_orders.`,
    );
  }

  return filtered;
}

async function loadTasksFromView(
  build: (table: typeof INDUSTRIAL_VIEW_TABLES.tasksView) => Promise<IndustrialWorkOrderTask[]>,
): Promise<IndustrialWorkOrderTask[] | null> {
  try {
    return await build(INDUSTRIAL_VIEW_TABLES.tasksView);
  } catch {
    return null;
  }
}

export async function loadWorkOrders(filters: WorkOrderFilters = {}): Promise<IndustrialWorkOrder[]> {
  if (filters.projectCode) {
    return loadWorkOrdersByProjectCode(filters.projectCode, filters);
  }

  let query = supabase.from(WORK_ORDER_TABLES.orders).select('*').order('created_at', { ascending: false });

  if (filters.projectId) query = query.eq('project_id', filters.projectId);
  if (filters.station) query = query.eq('station', filters.station);
  if (filters.status) {
    query = query.eq('status', filters.status);
  } else if (!filters.includeCancelled) {
    query = query.neq('status', 'cancelled');
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapWorkOrderRow);
}

/** Filtra ordens via `industrial_work_order_tasks_view.project_code`. */
export async function loadWorkOrdersByProjectCode(
  projectCode: string,
  filters: Omit<WorkOrderFilters, 'projectCode' | 'projectId'> = {},
): Promise<IndustrialWorkOrder[]> {
  const code = projectCode.trim();
  if (!code) return loadWorkOrders({ station: filters.station, status: filters.status });

  const { data: viewRows, error: viewError } = await supabase
    .from(INDUSTRIAL_VIEW_TABLES.tasksView)
    .select('*')
    .eq('project_code', code.toUpperCase());

  if (viewError) throw new Error(viewError.message);

  let tasks = (viewRows ?? []).map((row) =>
    mapTaskViewRow(row as Parameters<typeof mapTaskViewRow>[0]),
  );

  if (tasks.length === 0 && code !== code.toUpperCase()) {
    const retry = await supabase
      .from(INDUSTRIAL_VIEW_TABLES.tasksView)
      .select('*')
      .eq('project_code', code);
    if (retry.error) throw new Error(retry.error.message);
    tasks = (retry.data ?? []).map((row) =>
      mapTaskViewRow(row as Parameters<typeof mapTaskViewRow>[0]),
    );
  }

  const workOrderIds = Array.from(new Set(tasks.map((task) => task.workOrderId)));
  if (workOrderIds.length === 0) return [];

  let query = supabase
    .from(WORK_ORDER_TABLES.orders)
    .select('*')
    .in('id', workOrderIds)
    .order('created_at', { ascending: false });

  if (filters.station) query = query.eq('station', filters.station);
  if (filters.status) {
    query = query.eq('status', filters.status);
  } else if (!filters.includeCancelled) {
    query = query.neq('status', 'cancelled');
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map(mapWorkOrderRow);
}

export async function loadWorkOrderById(workOrderId: string): Promise<IndustrialWorkOrder | null> {
  const { data, error } = await supabase
    .from(WORK_ORDER_TABLES.orders)
    .select('*')
    .eq('id', workOrderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapWorkOrderRow(data) : null;
}

export async function loadTasksByWorkOrder(workOrderId: string): Promise<IndustrialWorkOrderTask[]> {
  const order = await loadWorkOrderById(workOrderId);

  const fromView = await loadTasksFromView(async () => {
    const { data, error } = await supabase
      .from(INDUSTRIAL_VIEW_TABLES.tasksView)
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapTaskViewRow(row as Parameters<typeof mapTaskViewRow>[0]));
  });

  if (fromView && fromView.length > 0) {
    return order ? enrichTasks(fromView, [order]) : fromView;
  }

  const { data, error } = await supabase
    .from(WORK_ORDER_TABLES.tasks)
    .select('*')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  const tasks = (data ?? []).map(mapTaskRow);
  return order ? enrichTasks(tasks, [order]) : tasks;
}

export async function loadTasksByPiece(pieceId: string): Promise<IndustrialWorkOrderTask[]> {
  const fromView = await loadTasksFromView(async () => {
    const { data, error } = await supabase
      .from(INDUSTRIAL_VIEW_TABLES.tasksView)
      .select('*')
      .eq('piece_id', pieceId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapTaskViewRow(row as Parameters<typeof mapTaskViewRow>[0]));
  });

  if (fromView && fromView.length > 0) {
    const validTasks = await filterTasksWithExistingOrders(fromView);
    const orderIds = Array.from(new Set(validTasks.map((task) => task.workOrderId)));
    const orders = (
      await Promise.all(orderIds.map((id) => loadWorkOrderById(id)))
    ).filter((order): order is IndustrialWorkOrder => order !== null);
    return enrichTasks(validTasks, orders);
  }

  const { data, error } = await supabase
    .from(WORK_ORDER_TABLES.tasks)
    .select('*')
    .eq('piece_id', pieceId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const tasks = (data ?? []).map(mapTaskRow);
  const validTasks = await filterTasksWithExistingOrders(tasks);
  const orderIds = Array.from(new Set(validTasks.map((task) => task.workOrderId)));
  const orders = await Promise.all(orderIds.map((id) => loadWorkOrderById(id)));
  const validOrders = orders.filter((order): order is IndustrialWorkOrder => order !== null);
  return enrichTasks(validTasks, validOrders);
}

export async function loadTaskById(taskId: string): Promise<IndustrialWorkOrderTask | null> {
  try {
    const { data, error } = await supabase
      .from(INDUSTRIAL_VIEW_TABLES.tasksView)
      .select('*')
      .eq('id', taskId)
      .maybeSingle();
    if (!error && data) return mapTaskViewRow(data as Parameters<typeof mapTaskViewRow>[0]);
  } catch {
    // fallback
  }

  const { data, error } = await supabase
    .from(WORK_ORDER_TABLES.tasks)
    .select('*')
    .eq('id', taskId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  const task = mapTaskRow(data);
  const order = await loadWorkOrderById(task.workOrderId);
  return order ? enrichTasks([task], [order])[0]! : task;
}

export async function loadTasksByStation(station: IndustrialStation): Promise<IndustrialWorkOrderTask[]> {
  const orders = await loadWorkOrders({ station });
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);

  const fromView = await loadTasksFromView(async () => {
    const { data, error } = await supabase
      .from(INDUSTRIAL_VIEW_TABLES.tasksView)
      .select('*')
      .in('work_order_id', orderIds)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapTaskViewRow(row as Parameters<typeof mapTaskViewRow>[0]));
  });

  if (fromView && fromView.length > 0) return enrichTasks(fromView, orders);

  const { data, error } = await supabase
    .from(WORK_ORDER_TABLES.tasks)
    .select('*')
    .in('work_order_id', orderIds)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return enrichTasks((data ?? []).map(mapTaskRow), orders);
}

export async function loadTasksByOperator(operatorId?: string): Promise<IndustrialWorkOrderTask[]> {
  let tasks: IndustrialWorkOrderTask[] = [];

  if (operatorId) {
    const assigned = await loadTasksFromView(async () => {
      const { data, error } = await supabase
        .from(INDUSTRIAL_VIEW_TABLES.tasksView)
        .select('*')
        .eq('operator_id', operatorId)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => mapTaskViewRow(row as Parameters<typeof mapTaskViewRow>[0]));
    });
    const open = await loadTasksFromView(async () => {
      const { data, error } = await supabase
        .from(INDUSTRIAL_VIEW_TABLES.tasksView)
        .select('*')
        .is('operator_id', null)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => mapTaskViewRow(row as Parameters<typeof mapTaskViewRow>[0]));
    });
    const seen = new Set<string>();
    tasks = [...(assigned ?? []), ...(open ?? [])].filter((task) => {
      if (seen.has(task.id)) return false;
      seen.add(task.id);
      return true;
    });
  } else {
    const all = await loadTasksFromView(async () => {
      const { data, error } = await supabase
        .from(INDUSTRIAL_VIEW_TABLES.tasksView)
        .select('*')
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => mapTaskViewRow(row as Parameters<typeof mapTaskViewRow>[0]));
    });
    tasks = all ?? [];
  }

  if (tasks.length === 0) {
    if (operatorId) {
      const { data: assigned, error: assignedError } = await supabase
        .from(WORK_ORDER_TABLES.tasks)
        .select('*')
        .eq('operator_id', operatorId)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(300);
      if (assignedError) throw new Error(assignedError.message);

      const { data: open, error: openError } = await supabase
        .from(WORK_ORDER_TABLES.tasks)
        .select('*')
        .is('operator_id', null)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(200);
      if (openError) throw new Error(openError.message);

      const merged = [...(assigned ?? []), ...(open ?? [])];
      const seen = new Set<string>();
      tasks = merged
        .filter((row) => {
          const id = String(row.id);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        })
        .map(mapTaskRow);
    } else {
      const { data, error } = await supabase
        .from(WORK_ORDER_TABLES.tasks)
        .select('*')
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw new Error(error.message);
      tasks = (data ?? []).map(mapTaskRow);
    }
  }

  const orderIds = Array.from(new Set(tasks.map((task) => task.workOrderId)));
  const orders = (await Promise.all(orderIds.map((id) => loadWorkOrderById(id)))).filter(
    (order): order is IndustrialWorkOrder => order !== null,
  );
  return enrichTasks(tasks, orders);
}

export async function loadTasksByWorkOrderIds(workOrderIds: string[]): Promise<IndustrialWorkOrderTask[]> {
  if (workOrderIds.length === 0) return [];

  const fromView = await loadTasksFromView(async () => {
    const { data, error } = await supabase
      .from(INDUSTRIAL_VIEW_TABLES.tasksView)
      .select('*')
      .in('work_order_id', workOrderIds)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapTaskViewRow(row as Parameters<typeof mapTaskViewRow>[0]));
  });

  if (fromView && fromView.length > 0) {
    const orders = (await Promise.all(workOrderIds.map((id) => loadWorkOrderById(id)))).filter(
      (order): order is IndustrialWorkOrder => order !== null,
    );
    return enrichTasks(fromView, orders);
  }

  const { data, error } = await supabase
    .from(WORK_ORDER_TABLES.tasks)
    .select('*')
    .in('work_order_id', workOrderIds)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  const tasks = (data ?? []).map(mapTaskRow);
  const orders = (await Promise.all(workOrderIds.map((id) => loadWorkOrderById(id)))).filter(
    (order): order is IndustrialWorkOrder => order !== null,
  );
  return enrichTasks(tasks, orders);
}

export async function loadWorkOrderEvents(filters?: {
  operatorId?: string;
  workOrderIds?: string[];
  limit?: number;
}) {
  const limit = filters?.limit ?? 50;
  let query = supabase
    .from(WORK_ORDER_TABLES.events)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters?.operatorId) query = query.eq('operator_id', filters.operatorId);
  if (filters?.workOrderIds?.length) query = query.in('work_order_id', filters.workOrderIds);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function loadTrackingByPieceIds(pieceIds: string[]): Promise<IndustrialWorkOrderTask[]> {
  if (pieceIds.length === 0) return [];

  const fromView = await loadTasksFromView(async () => {
    const { data, error } = await supabase
      .from(INDUSTRIAL_VIEW_TABLES.tracking)
      .select('*')
      .in('piece_id', pieceIds);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapTaskViewRow(row as Parameters<typeof mapTaskViewRow>[0]));
  });

  if (fromView) return fromView;
  return loadTasksByPiece(pieceIds[0]!);
}
