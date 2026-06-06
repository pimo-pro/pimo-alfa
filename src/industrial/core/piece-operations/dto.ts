// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

import type { PieceOperationStatus, PieceOperationType } from './types';

export interface CreatePieceOperationDto {
  id?: string;
  pieceId: string;
  type: PieceOperationType;
  stationId?: string;
  operatorId?: string;
  notes?: string;
}

export interface UpdatePieceOperationDto {
  status?: PieceOperationStatus;
  stationId?: string;
  operatorId?: string;
  notes?: string;
}

export interface OperationTrackingPayloadDto {
  operationId: string;
  pieceId: string;
  status: PieceOperationStatus;
  stationId?: string;
  operatorId?: string;
  timestamp: string;
}
