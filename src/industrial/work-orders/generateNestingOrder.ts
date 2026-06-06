import type { IndustrialPiece } from '@/industrial/core/pieces/types';

import type { GeneratedWorkOrderDraft } from './types';

export function generateNestingOrder(pieces: IndustrialPiece[]): GeneratedWorkOrderDraft {
  const tasks = pieces.map((piece) => ({
    pieceId: piece.id,
    operationType: 'nesting',
  }));

  return {
    station: 'nesting',
    pieceIds: pieces.map((p) => p.id),
    operationTypes: ['nesting'],
    tasks,
  };
}
