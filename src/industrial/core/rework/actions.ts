// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

import type { CreateReworkDto, UpdateReworkDto } from './dto';
import type { ReworkRequest, ReworkStatus } from './types';

export function createReworkRequest(_pieceId: string, _reason: string, _requestedBy?: string): ReworkRequest;
export function createReworkRequest(_input: CreateReworkDto): ReworkRequest;
export function createReworkRequest(
  inputOrPieceId: CreateReworkDto | string,
  reason?: string,
  requestedBy?: string,
): ReworkRequest {
  const createdAt = typeof inputOrPieceId === 'string' ? new Date().toISOString() : (inputOrPieceId.createdAt ?? new Date().toISOString());
  const input =
    typeof inputOrPieceId === 'string'
      ? { pieceId: inputOrPieceId, reason: reason ?? 'Retrabalho', requestedBy, origin: 'operator' as const }
      : inputOrPieceId;

  return {
    id: input.id ?? `${input.pieceId}:rework:${createdAt}`,
    pieceId: input.pieceId,
    reason: input.reason,
    origin: input.origin,
    fromOperationId: input.fromOperationId,
    toOperationId: input.toOperationId,
    requestedBy: input.requestedBy,
    operatorId: input.operatorId,
    status: 'open',
    createdAt,
  };
}

export function updateReworkRequest(request: ReworkRequest, input: UpdateReworkDto): ReworkRequest {
  const status = input.status ?? request.status;
  const terminal = status === 'resolved' || status === 'rejected';
  return {
    ...request,
    status,
    toOperationId: input.toOperationId ?? request.toOperationId,
    operatorId: input.operatorId ?? request.operatorId,
    resolvedBy: input.resolvedBy ?? request.resolvedBy,
    updatedAt: new Date().toISOString(),
    resolvedAt: terminal ? (input.resolvedAt ?? new Date().toISOString()) : request.resolvedAt,
  };
}

export function updateReworkStatus(
  request: ReworkRequest,
  status: ReworkStatus,
  resolvedBy?: string,
): ReworkRequest {
  return updateReworkRequest(request, { status, resolvedBy });
}
