import { supabase } from '@/industrial/infra/db';
import { industrialEventUtils, type IndustrialEventFilter, type IndustrialSystemEvent } from '@/industrial/infra/supabase/events';
import { INDUSTRIAL_TABLES } from '@/industrial/infra/supabase/tables';

export interface IndustrialEventPayload {
  work_order_id?: string;
  task_id?: string;
  user_id?: string;
  department_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Registra eventos industriais sem acoplar o core a componentes ou rotas.
 */
export async function logEvent(type: string, payload: IndustrialEventPayload = {}): Promise<IndustrialSystemEvent | null> {
  const { data, error } = await supabase.from(INDUSTRIAL_TABLES.systemEvents).insert({
    type,
    work_order_id: payload.work_order_id ?? null,
    task_id: payload.task_id ?? null,
    user_id: payload.user_id ?? null,
    department_id: payload.department_id ?? null,
    metadata: industrialEventUtils.createMetadata(payload.metadata ?? {}),
  }).select().single();

  if (error) {
    console.error('Erro ao registrar evento industrial:', error);
    return null;
  }

  return data as IndustrialSystemEvent;
}

export async function getEvents(filter: IndustrialEventFilter = {}): Promise<IndustrialSystemEvent[]> {
  let query = supabase.from(INDUSTRIAL_TABLES.systemEvents).select('*');

  if (filter.type?.length) query = query.in('type', filter.type);
  if (filter.user_id) query = query.eq('user_id', filter.user_id);
  if (filter.department_id) query = query.eq('department_id', filter.department_id);
  if (filter.work_order_id) query = query.eq('work_order_id', filter.work_order_id);
  if (filter.task_id) query = query.eq('task_id', filter.task_id);
  if (filter.date_from) query = query.gte('created_at', filter.date_from);
  if (filter.date_to) query = query.lte('created_at', filter.date_to);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(filter.offset ?? 0, (filter.offset ?? 0) + (filter.limit ?? 50) - 1);

  if (error) {
    console.error('Erro ao consultar eventos industriais:', error);
    return [];
  }

  return (data ?? []) as IndustrialSystemEvent[];
}

export async function getEventStats(filter: IndustrialEventFilter = {}) {
  const events = await getEvents({ ...filter, limit: filter.limit ?? 1000 });
  return events.reduce(
    (stats, event) => {
      stats.total += 1;
      stats.byType[event.type] = (stats.byType[event.type] ?? 0) + 1;
      const day = event.created_at.slice(0, 10);
      stats.byDay[day] = (stats.byDay[day] ?? 0) + 1;
      return stats;
    },
    { byType: {} as Record<string, number>, total: 0, byDay: {} as Record<string, number> },
  );
}
