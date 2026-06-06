import type { IndustrialPiece } from '@/industrial/core/pieces/types';

import type { GeneratedWorkOrderDraft } from './types';

export function generateOrlarOrder(pieces: IndustrialPiece[]): GeneratedWorkOrderDraft {
  const eligible = pieces.filter((piece) => piece.operations.includes('orlar'));
  const tasks = eligible.map((piece) => ({
    pieceId: piece.id,
    operationType: 'orlar',
  }));

  return {
    station: 'orlar',
    pieceIds: eligible.map((p) => p.id),
    operationTypes: ['orlar'],
    tasks,
  };
}
