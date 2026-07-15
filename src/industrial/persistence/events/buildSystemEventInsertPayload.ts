import type { PieceEventPayload } from '../shared/types';
import { isValidIndustrialUserId } from '../users/industrialUserIds';

/**
 * `system_events.work_order_id` e `system_events.user_id` referenciam tabelas legadas.
 * IDs PIMO-TRAK vivem em metadata (`industrial_*`).
 */
export function buildSystemEventInsertPayload(
  pieceId: string,
  payload: PieceEventPayload,
  industrialWorkOrderId: string | null,
  industrialUserId: string | null,
) {
  if (!industrialUserId || !isValidIndustrialUserId(industrialUserId)) {
    return null;
  }

  const requestedUserId =
    typeof payload.userId === 'string' && payload.userId.trim() !== ''
      ? payload.userId.trim()
      : null;

  return {
    type: payload.type,
    work_order_id: null as string | null,
    user_id: null as string | null,
    metadata: {
      piece_id: pieceId,
      pieceId,
      ui_event: true,
      industrial_user_id: industrialUserId,
      ...(requestedUserId ? { requested_user_id: requestedUserId } : {}),
      ...(industrialWorkOrderId ? { industrial_work_order_id: industrialWorkOrderId } : {}),
      ...payload.metadata,
    },
  };
}
