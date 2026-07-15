import type { PieceEventPayload } from '../shared/types';

/**
 * `system_events.work_order_id` referencia a tabela legada `work_orders`.
 * IDs PIMO-TRAK vivem em `industrial_work_orders` — gravamos em metadata.
 */
export function buildSystemEventInsertPayload(
  pieceId: string,
  payload: PieceEventPayload,
  industrialWorkOrderId: string | null,
) {
  return {
    type: payload.type,
    work_order_id: null as string | null,
    user_id: payload.userId ?? null,
    metadata: {
      piece_id: pieceId,
      pieceId,
      ui_event: true,
      ...(industrialWorkOrderId ? { industrial_work_order_id: industrialWorkOrderId } : {}),
      ...payload.metadata,
    },
  };
}
