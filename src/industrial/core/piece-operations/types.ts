// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

export type PieceOperationType = 'nesting' | 'cnc' | 'drill' | 'orlar' | 'montagem' | 'embalagem' | 'limpeza';
export type PieceOperationStatus = 'queued' | 'running' | 'paused' | 'done' | 'failed';

export interface PieceOperation {
  id: string;
  pieceId: string;
  type: PieceOperationType;
  status: PieceOperationStatus;
  stationId?: string;
  operatorId?: string;
  startedAt?: string;
  finishedAt?: string;
  notes?: string;
}
