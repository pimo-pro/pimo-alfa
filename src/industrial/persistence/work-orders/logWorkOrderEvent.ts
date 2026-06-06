import { supabase } from '@/industrial/infra/db';

import { mapEventRow } from './mappers';
import { WORK_ORDER_TABLES } from './tables';
import type { IndustrialWorkOrderEvent } from '@/industrial/work-orders/types';

export interface LogWorkOrderEventInput {
  workOrderId?: string;
  taskId?: string;
  eventType: string;
  operatorId?: string;
  metadata?: Record<string, unknown>;
}

export async function logWorkOrderEvent(input: LogWorkOrderEventInput): Promise<IndustrialWorkOrderEvent> {
  const { data, error } = await supabase
    .from(WORK_ORDER_TABLES.events)
    .insert({
      work_order_id: input.workOrderId ?? null,
      task_id: input.taskId ?? null,
      event_type: input.eventType,
      operator_id: input.operatorId ?? null,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Falha ao registar evento.');
  return mapEventRow(data);
}
