import { supabase } from '@/industrial/infra/db';
import type { IndustrialWorkOrderEvent } from '@/industrial/work-orders/types';

import { mapEventRow } from './mappers';
import { WORK_ORDER_TABLES } from './tables';
import { getOrCreateIndustrialUser } from '../users/getOrCreateIndustrialUser';
import { validateWorkOrderId } from './validateWorkOrderId';

export interface LogWorkOrderEventInput {
  workOrderId?: string;
  taskId?: string;
  eventType: string;
  operatorId?: string;
  metadata?: Record<string, unknown>;
}

export async function logWorkOrderEvent(
  input: LogWorkOrderEventInput,
): Promise<IndustrialWorkOrderEvent | null> {
  const validatedWorkOrderId = await validateWorkOrderId(
    input.workOrderId,
    `industrial_work_order_events:${input.eventType}`,
  );

  if (!validatedWorkOrderId) {
    console.warn(
      `[industrial] Evento WO "${input.eventType}" não registado — work_order_id em falta ou inválido.`,
    );
    return null;
  }

  const industrialUser = await getOrCreateIndustrialUser(input.operatorId);

  const { data, error } = await supabase
    .from(WORK_ORDER_TABLES.events)
    .insert({
      work_order_id: validatedWorkOrderId,
      task_id: input.taskId ?? null,
      event_type: input.eventType,
      operator_id: industrialUser.id,
      metadata: {
        ...(input.metadata ?? {}),
        industrial_user_id: industrialUser.id,
      },
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Falha ao registar evento.');
  return mapEventRow(data);
}
