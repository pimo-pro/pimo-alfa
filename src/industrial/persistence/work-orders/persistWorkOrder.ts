import { supabase } from '@/industrial/infra/db';
import type { GeneratedWorkOrderDraft, IndustrialWorkOrder, WorkOrderPieceDisplay } from '@/industrial/work-orders/types';
import { buildTaskMetadataForPiece } from '@/industrial/work-orders/resolveWorkOrderPiece';

import { mapWorkOrderRow } from './mappers';
import { WORK_ORDER_TABLES } from './tables';
import { assertIndustrialWorkOrderId } from './validateWorkOrderBeforeEvent';
import { markWorkOrderIdKnownValid } from './validateWorkOrderId';

export interface PersistWorkOrderOptions {
  pieceDisplayById?: Map<string, WorkOrderPieceDisplay>;
  projectCode?: string;
}

export async function persistWorkOrderDraft(
  projectId: string,
  draft: GeneratedWorkOrderDraft,
  options: PersistWorkOrderOptions = {},
): Promise<IndustrialWorkOrder> {
  const now = new Date().toISOString();
  const { pieceDisplayById, projectCode } = options;

  const { data: orderRow, error: orderError } = await supabase
    .from(WORK_ORDER_TABLES.orders)
    .insert({
      project_id: projectId,
      station: draft.station,
      status: 'pending',
      piece_ids: draft.pieceIds,
      operation_types: draft.operationTypes,
      metadata: {
        generatedAt: now,
        ...(projectCode ? { project_code: projectCode } : {}),
      },
      updated_at: now,
    })
    .select()
    .single();

  if (orderError || !orderRow) {
    throw new Error(orderError?.message ?? 'Falha ao criar ordem de trabalho.');
  }

  assertIndustrialWorkOrderId(orderRow.id);
  markWorkOrderIdKnownValid(orderRow.id);

  const taskRows = draft.tasks.map((task) => {
    const display = pieceDisplayById?.get(task.pieceId) ?? null;
    const metadata = buildTaskMetadataForPiece(task.pieceId, projectId, display);
    if (!metadata.full_industrial_name) {
      console.warn(
        `[WO] Metadata industrial em falta para peça ${task.pieceId} (estação ${draft.station}).`,
      );
    }
    return {
      work_order_id: orderRow.id,
      piece_id: task.pieceId,
      operation_type: task.operationType,
      status: 'pending',
      metadata,
      updated_at: now,
    };
  });

  const { error: tasksError } = await supabase.from(WORK_ORDER_TABLES.tasks).insert(taskRows);
  if (tasksError) {
    throw new Error(tasksError.message);
  }

  // Eventos WO: apenas após ordem + tasks persistidas (industrial_work_order_events, não system_events).
  await supabase.from(WORK_ORDER_TABLES.events).insert({
    work_order_id: orderRow.id,
    event_type: 'work_order_created',
    metadata: {
      station: draft.station,
      taskCount: draft.tasks.length,
      ...(projectCode ? { project_code: projectCode } : {}),
    },
  });

  return mapWorkOrderRow(orderRow);
}
