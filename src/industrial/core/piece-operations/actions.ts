// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

import type { CreatePieceOperationDto, UpdatePieceOperationDto } from './dto';
import type { PieceOperation, PieceOperationStatus, PieceOperationType } from './types';

export function createPieceOperation(_pieceId: string, _type: PieceOperationType): PieceOperation;
export function createPieceOperation(_input: CreatePieceOperationDto): PieceOperation;
export function createPieceOperation(
  inputOrPieceId: CreatePieceOperationDto | string,
  type?: PieceOperationType,
): PieceOperation {
  const input =
    typeof inputOrPieceId === 'string'
      ? { pieceId: inputOrPieceId, type: type ?? 'cnc' }
      : inputOrPieceId;

  return {
    id: input.id ?? `${input.pieceId}:${input.type}`,
    pieceId: input.pieceId,
    type: input.type,
    status: 'queued',
    stationId: input.stationId,
    operatorId: input.operatorId,
    notes: input.notes,
  };
}

export function updatePieceOperation(operation: PieceOperation, input: UpdatePieceOperationDto): PieceOperation {
  return {
    ...operation,
    status: input.status ?? operation.status,
    stationId: input.stationId ?? operation.stationId,
    operatorId: input.operatorId ?? operation.operatorId,
    notes: input.notes ?? operation.notes,
  };
}

export function updatePieceOperationStatus(
  operation: PieceOperation,
  status: PieceOperationStatus,
  operatorId?: string,
): PieceOperation {
  const timestamp = new Date().toISOString();
  return {
    ...operation,
    status,
    operatorId: operatorId ?? operation.operatorId,
    startedAt: status === 'running' ? (operation.startedAt ?? timestamp) : operation.startedAt,
    finishedAt: status === 'done' || status === 'failed' ? timestamp : operation.finishedAt,
  };
}
