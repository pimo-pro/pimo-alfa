import { supabase } from '@/industrial/infra/db';
import {
  INDUSTRIAL_PIECE_EVENT_TYPES,
} from '@/industrial/persistence/work-orders/validateWorkOrderId';
import {
  notifyWorkOrderSyncError,
  validateWorkOrderBeforeEvent,
} from '@/industrial/persistence/work-orders/validateWorkOrderBeforeEvent';

import { PIECE_PERSISTENCE_TABLES } from '../tables';
import { assertPieceId } from '../shared/validation';
import type { PieceEventPayload } from '../shared/types';
import { buildSystemEventInsertPayload } from './buildSystemEventInsertPayload';

export async function logPieceEvent(pieceId: string, payload: PieceEventPayload) {
  assertPieceId(pieceId);
  if (!payload.type) throw new Error('Tipo de evento inválido.');

  const requiresWorkOrder = INDUSTRIAL_PIECE_EVENT_TYPES.has(payload.type);
  const validation = payload.workOrderId
    ? await validateWorkOrderBeforeEvent(
        payload.workOrderId,
        `system_events:${payload.type}:piece=${pieceId}`,
      )
    : { ok: false as const, workOrderId: null as string | null };

  if (requiresWorkOrder && !validation.ok) {
    notifyWorkOrderSyncError();
    console.warn(
      `[industrial] Evento "${payload.type}" não registado — work_order_id em falta ou inválido (peça ${pieceId}).`,
    );
    return null;
  }

  const industrialWorkOrderId = validation.ok ? validation.workOrderId : null;
  const insertPayload = buildSystemEventInsertPayload(pieceId, payload, industrialWorkOrderId);

  const { data, error } = await supabase
    .from(PIECE_PERSISTENCE_TABLES.systemEvents)
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
