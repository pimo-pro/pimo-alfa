// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

import type { IndustrialPiece } from '@/industrial/core/pieces/types';
import type { OperationTrackingPayloadDto } from './dto';
import { createPieceOperation } from './actions';
import type { PieceOperation } from './types';

export function pieceToOperations(piece: IndustrialPiece): PieceOperation[] {
  return piece.operations.map((operationType) =>
    createPieceOperation({
      id: `${piece.id}:${operationType}`,
      pieceId: piece.id,
      type: operationType,
    }),
  );
}

export function operationsToTrackingPayloads(operations: PieceOperation[]): OperationTrackingPayloadDto[] {
  const timestamp = new Date().toISOString();
  return operations.map((operation) => ({
    operationId: operation.id,
    pieceId: operation.pieceId,
    status: operation.status,
    stationId: operation.stationId,
    operatorId: operation.operatorId,
    timestamp,
  }));
}
