import type { IndustrialPiece } from '@/industrial/core/pieces/types';

import { generateDrillOrder } from './generateDrillOrder';
import { generateEmbalagemOrder } from './generateEmbalagemOrder';
import { generateMontagemOrder } from './generateMontagemOrder';
import { generateNestingOrder } from './generateNestingOrder';
import { generateOrlarOrder } from './generateOrlarOrder';
import { generateWarehouseOrder } from './generateWarehouseOrder';
import type { GeneratedWorkOrderDraft } from './types';

export type StationOrderGenerator = (pieces: IndustrialPiece[]) => GeneratedWorkOrderDraft;

/**
 * Registo central de geradores por estação (substitui array inline em createWorkOrdersForProject).
 * Ordem: warehouse → nesting → drill → orlar → montagem → embalagem.
 */
export const STATION_ORDER_GENERATORS: readonly StationOrderGenerator[] = [
  generateWarehouseOrder,
  generateNestingOrder,
  generateDrillOrder,
  generateOrlarOrder,
  generateMontagemOrder,
  generateEmbalagemOrder,
] as const;

export function generateAllStationOrderDrafts(pieces: IndustrialPiece[]): GeneratedWorkOrderDraft[] {
  return STATION_ORDER_GENERATORS.map((generate) => generate(pieces));
}
