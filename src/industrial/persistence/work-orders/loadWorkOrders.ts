import { supabase } from '@/industrial/infra/db';
import type { IndustrialStation, IndustrialWorkOrder } from '@/industrial/work-orders/types';

import { mapTaskRow, mapWorkOrderRow } from './mappers';
import { WORK_ORDER_TABLES } from './tables';
import type { IndustrialWorkOrderTask } from '@/industrial/work-orders/types';

export interface WorkOrderFilters {
  projectId?: string;
  station?: IndustrialStation;
  status?: string;
}

export async function loadWorkOrders(filters: WorkOrderFilters = {}): Promise<IndustrialWorkOrder[]> {
  let query = supabase.from(WORK_ORDER_TABLES.orders).select('*').order('created_at', { ascending: false });

  if (filters.projectId) query = query.eq('project_id', filters.projectId);
  if (filters.station) query = query.eq('station', filters.station);
  if (filters.status) query = query.eq('status', filters.status);

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
  const { data, error } = await supabase
    .from(WORK_ORDER_TABLES.tasks)
    .select('*')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTaskRow);
}

export async function loadTasksByPiece(pieceId: string): Promise<IndustrialWorkOrderTask[]> {
  const { data, error } = await supabase
    .from(WORK_ORDER_TABLES.tasks)
    .select('*')
    .eq('piece_id', pieceId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTaskRow);
}

export async function loadTaskById(taskId: string): Promise<IndustrialWorkOrderTask | null> {
  const { data, error } = await supabase
    .from(WORK_ORDER_TABLES.tasks)
    .select('*')
    .eq('id', taskId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapTaskRow(data) : null;
}

export async function loadTasksByStation(station: IndustrialStation): Promise<IndustrialWorkOrderTask[]> {
  const orders = await loadWorkOrders({ station });
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const { data, error } = await supabase
    .from(WORK_ORDER_TABLES.tasks)
    .select('*')
    .in('work_order_id', orderIds)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTaskRow);
}
