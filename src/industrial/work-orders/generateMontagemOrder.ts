import type { IndustrialPiece } from '@/industrial/core/pieces/types';

import type { GeneratedWorkOrderDraft } from './types';

export function generateMontagemOrder(pieces: IndustrialPiece[]): GeneratedWorkOrderDraft {
  const eligible = pieces.filter((piece) => piece.operations.includes('montagem'));
  const tasks = eligible.map((piece) => ({
    pieceId: piece.id,
    operationType: 'montagem',
  }));

  return {
    station: 'montagem',
    pieceIds: eligible.map((p) => p.id),
    operationTypes: ['montagem'],
    tasks,
  };
}
