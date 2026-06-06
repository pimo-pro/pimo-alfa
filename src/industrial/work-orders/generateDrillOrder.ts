import type { IndustrialPiece } from '@/industrial/core/pieces/types';

import type { GeneratedWorkOrderDraft } from './types';

export function generateDrillOrder(pieces: IndustrialPiece[]): GeneratedWorkOrderDraft {
  const eligible = pieces.filter((piece) => piece.operations.includes('drill'));
  const tasks = eligible.map((piece) => ({
    pieceId: piece.id,
    operationType: 'drill',
  }));

  return {
    station: 'drill',
    pieceIds: eligible.map((p) => p.id),
    operationTypes: ['drill'],
    tasks,
  };
}
