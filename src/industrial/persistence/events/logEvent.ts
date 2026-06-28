import { supabase } from '@/industrial/infra/db';
import {
  INDUSTRIAL_PIECE_EVENT_TYPES,
  validateWorkOrderId,
} from '@/industrial/persistence/work-orders/validateWorkOrderId';

import { PIECE_PERSISTENCE_TABLES } from '../tables';
import { assertPieceId } from '../shared/validation';
import type { PieceEventPayload } from '../shared/types';

export async function logPieceEvent(pieceId: string, payload: PieceEventPayload) {
  assertPieceId(pieceId);
  if (!payload.type) throw new Error('Tipo de evento inválido.');

  const requiresWorkOrder = INDUSTRIAL_PIECE_EVENT_TYPES.has(payload.type);
  const validatedWorkOrderId = payload.workOrderId
    ? await validateWorkOrderId(payload.workOrderId, `system_events:${payload.type}:piece=${pieceId}`)
    : null;

  if (requiresWorkOrder && !validatedWorkOrderId) {
    console.warn(
      `[industrial] Evento "${payload.type}" não registado — work_order_id em falta ou inválido (peça ${pieceId}).`,
    );
    return null;
  }

  const workOrderIdForInsert =
    payload.workOrderId != null && payload.workOrderId !== ''
      ? validatedWorkOrderId
      : null;

  const metadata = {
    piece_id: pieceId,
    pieceId,
    ui_event: true,
    ...payload.metadata,
  };

  const { data, error } = await supabase
    .from(PIECE_PERSISTENCE_TABLES.systemEvents)
    .insert({
      type: payload.type,
      work_order_id: workOrderIdForInsert,
      user_id: payload.userId ?? null,
      metadata,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
