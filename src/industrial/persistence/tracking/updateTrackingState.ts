import { updatePieceOperationStatus } from '@/industrial/core/piece-operations/actions';
import type { PieceOperation, PieceOperationStatus } from '@/industrial/core/piece-operations/types';

import { logPieceEvent } from '../events/logEvent';
import { savePieceOperations } from '../piece/savePieceOperations';

export type TrackingAction =
  | 'start'
  | 'pause'
  | 'finish'
  | 'reject'
  | 'rework';

const STATUS_BY_ACTION: Record<TrackingAction, PieceOperationStatus> = {
  start: 'running',
  pause: 'paused',
  finish: 'done',
  reject: 'failed',
  rework: 'queued',
};

export async function updateTrackingState(
  pieceId: string,
  operation: PieceOperation,
  action: TrackingAction,
  context?: { workOrderId?: string; userId?: string; reason?: string },
) {
  const status = STATUS_BY_ACTION[action];
  const updated = updatePieceOperationStatus(operation, status, context?.userId);

  await savePieceOperations(pieceId, {
    operationId: operation.id,
    status: updated.status,
    payload: {
      action,
      startedAt: updated.startedAt,
      finishedAt: updated.finishedAt,
      reason: context?.reason,
    },
  });

  const eventType =
    action === 'start'
      ? 'operation_started'
      : action === 'finish' || action === 'reject'
        ? 'operation_finished'
        : action === 'rework'
          ? 'rework_requested'
          : 'operation_started';

  await logPieceEvent(pieceId, {
    type: eventType,
    workOrderId: context?.workOrderId,
    userId: context?.userId,
    metadata: {
      operation_id: operation.id,
      operation_type: operation.type,
      action,
      status: updated.status,
      reason: context?.reason,
    },
  });

  return updated;
}
