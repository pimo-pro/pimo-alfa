// Domínio novo — não migrado do work-whatsapp
// Baseado no pimo-criativo
// Preparado para integração na Fase 3C (UI & Operations Integration)

import type { ReworkPayloadDto } from './dto';
import type { ReworkRequest } from './types';

export function reworkToPayload(rework: ReworkRequest): ReworkPayloadDto {
  return {
    id: rework.id,
    pieceId: rework.pieceId,
    reason: rework.reason,
    origin: rework.origin,
    status: rework.status,
    route: {
      fromOperationId: rework.fromOperationId,
      toOperationId: rework.toOperationId,
    },
  };
}

export function openReworksForPiece(reworks: ReworkRequest[], pieceId: string): ReworkRequest[] {
  return reworks.filter((rework) => rework.pieceId === pieceId && rework.status !== 'resolved' && rework.status !== 'rejected');
}
