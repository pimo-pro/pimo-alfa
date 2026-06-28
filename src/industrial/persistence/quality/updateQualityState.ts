import { createQualityInspection } from '@/industrial/core/quality/actions';
import type { QualityDecision } from '@/industrial/core/quality/types';
import { resolveValidatedWorkOrderIdForPiece } from '@/industrial/persistence/work-orders/resolvePieceWorkOrderId';
import { validateWorkOrderId } from '@/industrial/persistence/work-orders/validateWorkOrderId';

import { logPieceEvent } from '../events/logEvent';
import { savePieceQuality } from '../piece/savePieceQuality';

export async function updateQualityState(
  pieceId: string,
  decision: QualityDecision,
  context?: { inspectorId?: string; reason?: string; notes?: string; workOrderId?: string },
) {
  const inspection = createQualityInspection({
    pieceId,
    decision,
    inspectorId: context?.inspectorId,
    reason: context?.reason,
    notes: context?.notes,
  });

  await savePieceQuality(pieceId, {
    decision,
    payload: {
      inspection,
      reason: context?.reason,
      notes: context?.notes,
    },
  });

  let workOrderId = context?.workOrderId
    ? await validateWorkOrderId(context.workOrderId, `quality:piece=${pieceId}`)
    : null;
  if (!workOrderId) {
    workOrderId = await resolveValidatedWorkOrderIdForPiece(pieceId);
  }

  await logPieceEvent(pieceId, {
    type: decision === 'rework' ? 'rework_requested' : 'quality_checked',
    workOrderId: workOrderId ?? undefined,
    userId: context?.inspectorId,
    metadata: {
      quality_inspection: inspection,
      decision,
    },
  });

  return inspection;
}
