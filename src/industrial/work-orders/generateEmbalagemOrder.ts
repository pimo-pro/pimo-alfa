import type { IndustrialPiece } from '@/industrial/core/pieces/types';

import type { GeneratedWorkOrderDraft } from './types';

export function generateEmbalagemOrder(pieces: IndustrialPiece[]): GeneratedWorkOrderDraft {
  const eligible = pieces.filter((piece) => piece.operations.includes('embalagem'));
  const tasks = eligible.map((piece) => ({
    pieceId: piece.id,
    operationType: 'embalagem',
  }));

  return {
    station: 'embalagem',
    pieceIds: eligible.map((p) => p.id),
    operationTypes: ['embalagem'],
    tasks,
  };
}
