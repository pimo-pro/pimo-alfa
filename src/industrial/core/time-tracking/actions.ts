// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

import type { StartTimeTrackingDto } from './dto';
import type { TimeTrackingEntry } from './types';

export function startTimeTracking(input: StartTimeTrackingDto): TimeTrackingEntry {
  const startedAt = input.startedAt ?? new Date().toISOString();
  return {
    pieceId: input.pieceId,
    operationId: input.operationId,
    workOrderId: input.workOrderId,
    userId: input.userId,
    stationId: input.stationId,
    id: input.id ?? `${input.operationId ?? input.pieceId ?? 'time'}:${input.userId}:${startedAt}`,
    startedAt,
  };
}

export function stopTimeTracking(entry: TimeTrackingEntry, stoppedAt = new Date().toISOString()): TimeTrackingEntry {
  const started = new Date(entry.startedAt).getTime();
  const stopped = new Date(stoppedAt).getTime();
  return {
    ...entry,
    stoppedAt,
    durationMs: Math.max(0, stopped - started),
  };
}
