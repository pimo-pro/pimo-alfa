import type { CreatePieceOperationDto, UpdatePieceOperationDto } from '@/industrial/core/piece-operations/dto';
import type { PieceOperation } from '@/industrial/core/piece-operations/types';
import type { IndustrialUiActionIntent, IndustrialUiCard } from './types';

export function pieceOperationToUiCard(operation: PieceOperation): IndustrialUiCard {
  return {
    id: operation.id,
    title: `${operation.type.toUpperCase()} · ${operation.pieceId}`,
    subtitle: operation.stationId,
    status: operation.status,
    meta: {
      operatorId: operation.operatorId,
      startedAt: operation.startedAt,
      finishedAt: operation.finishedAt,
    },
  };
}

export function uiToCreateOperationIntent(
  payload: CreatePieceOperationDto,
): IndustrialUiActionIntent<CreatePieceOperationDto> {
  return { type: 'operation:create', payload };
}

export function uiToUpdateOperationIntent(
  payload: UpdatePieceOperationDto,
): IndustrialUiActionIntent<UpdatePieceOperationDto> {
  return { type: 'operation:update', payload };
}
