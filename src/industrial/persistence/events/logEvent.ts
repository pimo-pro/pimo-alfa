import { supabase } from '@/industrial/infra/db';
import { PIECE_PERSISTENCE_TABLES } from '../tables';
import { assertPieceId } from '../shared/validation';
import type { PieceEventPayload } from '../shared/types';

export async function logPieceEvent(pieceId: string, payload: PieceEventPayload) {
  assertPieceId(pieceId);
  if (!payload.type) throw new Error('Tipo de evento inválido.');

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
      work_order_id: payload.workOrderId ?? null,
      user_id: payload.userId ?? null,
      metadata,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
