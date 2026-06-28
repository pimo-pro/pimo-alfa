import { supabase } from '@/industrial/infra/db';
import type { GeneratedWorkOrderDraft, IndustrialWorkOrder } from '@/industrial/work-orders/types';

import { buildTaskMetadataForPiece } from './loadWorkOrders';
import { mapWorkOrderRow } from './mappers';
import { WORK_ORDER_TABLES } from './tables';

export async function persistWorkOrderDraft(
  projectId: string,
  draft: GeneratedWorkOrderDraft,
): Promise<IndustrialWorkOrder> {
  const now = new Date().toISOString();

  const { data: orderRow, error: orderError } = await supabase
    .from(WORK_ORDER_TABLES.orders)
    .insert({
      project_id: projectId,
      station: draft.station,
      status: 'pending',
      piece_ids: draft.pieceIds,
      operation_types: draft.operationTypes,
      metadata: { generatedAt: now },
      updated_at: now,
    })
    .select()
    .single();

  if (orderError || !orderRow) {
    throw new Error(orderError?.message ?? 'Falha ao criar ordem de trabalho.');
  }

  const taskRows = draft.tasks.map((task) => ({
    work_order_id: orderRow.id,
    piece_id: task.pieceId,
    operation_type: task.operationType,
    status: 'pending',
    metadata: buildTaskMetadataForPiece(task.pieceId, projectId),
    updated_at: now,
  }));

  const { error: tasksError } = await supabase.from(WORK_ORDER_TABLES.tasks).insert(taskRows);
  if (tasksError) {
    throw new Error(tasksError.message);
  }

  await supabase.from(WORK_ORDER_TABLES.events).insert({
    work_order_id: orderRow.id,
    event_type: 'work_order_created',
    metadata: { station: draft.station, taskCount: draft.tasks.length },
  });

  return mapWorkOrderRow(orderRow);
}
