// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

export interface TimeTrackingEntry {
  id: string;
  pieceId?: string;
  operationId?: string;
  workOrderId?: string;
  userId: string;
  stationId?: string;
  startedAt: string;
  stoppedAt?: string;
  durationMs?: number;
}
