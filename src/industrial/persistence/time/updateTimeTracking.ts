import { startTimeTracking, stopTimeTracking } from '@/industrial/core/time-tracking/actions';
import type { TimeTrackingEntry } from '@/industrial/core/time-tracking/types';

import { logPieceEvent } from '../events/logEvent';
import { savePieceTimeTracking } from '../piece/savePieceTimeTracking';

export async function startPieceTime(
  pieceId: string,
  context: {
    operationId?: string;
    workOrderId?: string;
    userId: string;
    stationId?: string;
  },
): Promise<TimeTrackingEntry> {
  const entry = startTimeTracking({
    pieceId,
    operationId: context.operationId,
    workOrderId: context.workOrderId,
    userId: context.userId,
    stationId: context.stationId,
  });

  await savePieceTimeTracking(pieceId, { ...entry, action: 'start' });
  await logPieceEvent(pieceId, {
    type: 'time_started',
    workOrderId: context.workOrderId,
    userId: context.userId,
    metadata: { time_entry: entry },
  });

  return entry;
}

export async function stopPieceTime(
  pieceId: string,
  entry: TimeTrackingEntry,
  context?: { workOrderId?: string; userId?: string },
): Promise<TimeTrackingEntry> {
  const stopped = stopTimeTracking(entry);
  await savePieceTimeTracking(pieceId, { ...stopped, action: 'stop' });
  await logPieceEvent(pieceId, {
    type: 'time_stopped',
    workOrderId: context?.workOrderId ?? entry.workOrderId,
    userId: context?.userId ?? entry.userId,
    metadata: {
      time_entry: stopped,
      duration_ms: stopped.durationMs,
    },
  });
  return stopped;
}
