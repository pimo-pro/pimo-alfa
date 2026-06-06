import type { StartTimeTrackingDto, StopTimeTrackingDto } from '@/industrial/core/time-tracking/dto';
import { timeEntryToPayload } from '@/industrial/core/time-tracking/mappers';
import type { TimeTrackingEntry } from '@/industrial/core/time-tracking/types';
import type { IndustrialUiActionIntent, IndustrialUiCard } from './types';

export function timeTrackingEntryToUiCard(entry: TimeTrackingEntry): IndustrialUiCard {
  const payload = timeEntryToPayload(entry);
  return {
    id: entry.id,
    title: entry.operationId ?? entry.pieceId ?? 'Tempo industrial',
    subtitle: payload.isRunning ? 'Em execução' : 'Parado',
    status: payload.isRunning ? 'running' : 'stopped',
    meta: { ...payload },
  };
}

export function uiToStartTimeTrackingIntent(
  payload: StartTimeTrackingDto,
): IndustrialUiActionIntent<StartTimeTrackingDto> {
  return { type: 'time-tracking:start', payload };
}

export function uiToStopTimeTrackingIntent(payload: StopTimeTrackingDto): IndustrialUiActionIntent<StopTimeTrackingDto> {
  return { type: 'time-tracking:stop', payload };
}
