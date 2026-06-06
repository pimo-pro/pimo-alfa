// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

import type { TimeTrackingPayloadDto } from './dto';
import type { TimeTrackingEntry } from './types';

export function timeEntryToPayload(entry: TimeTrackingEntry): TimeTrackingPayloadDto {
  return {
    id: entry.id,
    operationId: entry.operationId,
    userId: entry.userId,
    stationId: entry.stationId,
    durationMs: entry.durationMs,
    isRunning: !entry.stoppedAt,
  };
}

export function totalDurationMs(entries: TimeTrackingEntry[]): number {
  return entries.reduce((total, entry) => total + (entry.durationMs ?? 0), 0);
}
