// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

export interface StartTimeTrackingDto {
  id?: string;
  pieceId?: string;
  operationId?: string;
  workOrderId?: string;
  userId: string;
  stationId?: string;
  startedAt?: string;
}

export interface StopTimeTrackingDto {
  stoppedAt?: string;
}

export interface TimeTrackingPayloadDto {
  id: string;
  operationId?: string;
  userId: string;
  stationId?: string;
  durationMs?: number;
  isRunning: boolean;
}
