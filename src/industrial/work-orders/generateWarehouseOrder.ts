import type { IndustrialPiece } from '@/industrial/core/pieces/types';

import type { GeneratedWorkOrderDraft } from './types';

export function generateWarehouseOrder(pieces: IndustrialPiece[]): GeneratedWorkOrderDraft {
  const tasks = pieces.map((piece) => ({
    pieceId: piece.id,
    operationType: 'warehouse',
  }));

  return {
    station: 'warehouse',
    pieceIds: pieces.map((p) => p.id),
    operationTypes: ['warehouse'],
    tasks,
  };
}
