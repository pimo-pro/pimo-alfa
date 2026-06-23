import type { IndustrialPieceOperationKey } from '../core/pieces/types';
import type { PieceOperationType } from '../core/piece-operations/types';
import type { IndustrialStation } from '../work-orders/types';

/**
 * Mapa de chaves de operação — documentação executável (Fase 4–5).
 *
 * Unificação global adiada (Opção C — Pendente Khaled).
 *
 * @see docs/architecture/industrial-operations-map.md
 * @see docs/guides/industrial-dev-guide.md §5
 */

/** Estação WO → tipo de operação de peça (runtime UI). `warehouse` não tem operação de peça. */
export const STATION_TO_PIECE_OPERATION: Partial<Record<IndustrialStation, PieceOperationType>> = {
  nesting: 'nesting',
  drill: 'drill',
  orlar: 'orlar',
  montagem: 'montagem',
  embalagem: 'embalagem',
};

/** Operação de peça (cutlist) → estação WO canónica. `cnc` mapeia para `nesting`. */
export const PIECE_OPERATION_TO_STATION: Partial<
  Record<IndustrialPieceOperationKey, IndustrialStation>
> = {
  cnc: 'nesting',
  drill: 'drill',
  orlar: 'orlar',
  montagem: 'montagem',
  embalagem: 'embalagem',
};

/** Opção B — mapping na sync (desactivado por defeito). */
export const operationSyncConfig = {
  mapNestingToCncOnSync: false,
} as const;

export function mapStationOperationToPieceOperation(
  stationOperation: string,
): PieceOperationType | null {
  if (stationOperation === 'warehouse') return null;
  if (stationOperation === 'nesting' && operationSyncConfig.mapNestingToCncOnSync) {
    return 'cnc';
  }
  if (
    stationOperation === 'nesting' ||
    stationOperation === 'cnc' ||
    stationOperation === 'drill' ||
    stationOperation === 'orlar' ||
    stationOperation === 'montagem' ||
    stationOperation === 'embalagem' ||
    stationOperation === 'limpeza'
  ) {
    return stationOperation as PieceOperationType;
  }
  return null;
}

export function mapPieceOperationToStationOperation(
  pieceOperation: IndustrialPieceOperationKey,
): IndustrialStation | null {
  return PIECE_OPERATION_TO_STATION[pieceOperation] ?? null;
}
