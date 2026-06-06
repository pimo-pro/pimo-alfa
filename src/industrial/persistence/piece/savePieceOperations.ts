import { supabase } from '@/industrial/infra/db';
import type { PieceOperationStatus } from '@/industrial/core/piece-operations/types';

import { PIECE_PERSISTENCE_TABLES } from '../tables';
import { assertPieceId } from '../shared/validation';
import type { PieceOperationRecord } from '../shared/types';

export interface SavePieceOperationsInput {
  operationId: string;
  status: PieceOperationStatus;
  payload?: Record<string, unknown>;
}

export async function savePieceOperations(pieceId: string, input: SavePieceOperationsInput) {
  assertPieceId(pieceId);
  if (!input.operationId?.trim()) throw new Error('operationId inválido.');

  const { data, error } = await supabase
    .from(PIECE_PERSISTENCE_TABLES.operations)
    .upsert(
      {
        piece_id: pieceId,
        operation_id: input.operationId,
        status: input.status,
        payload: input.payload ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'piece_id,operation_id' },
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function loadPieceOperations(pieceId: string): Promise<PieceOperationRecord[]> {
  assertPieceId(pieceId);
  const { data, error } = await supabase
    .from(PIECE_PERSISTENCE_TABLES.operations)
    .select('*')
    .eq('piece_id', pieceId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    pieceId: row.piece_id as string,
    operationId: row.operation_id as string,
    status: row.status as PieceOperationStatus,
    payload: (row.payload ?? {}) as Record<string, unknown>,
  }));
}
