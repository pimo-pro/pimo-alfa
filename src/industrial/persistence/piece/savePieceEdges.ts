import { supabase } from '@/industrial/infra/db';

import { PIECE_PERSISTENCE_TABLES } from '../tables';
import { assertEntityId, assertPieceId } from '../shared/validation';
import type { PieceEdgeRecord, PieceEntityType } from '../shared/types';

export interface SavePieceEdgesInput {
  entityId: string;
  entityType: PieceEntityType;
  payload: Record<string, unknown>;
}

export async function savePieceEdges(pieceId: string, input: SavePieceEdgesInput) {
  assertPieceId(pieceId);
  assertEntityId(input.entityId);
  if (!input.payload || typeof input.payload !== 'object') {
    throw new Error('Payload de arestas inválido.');
  }

  const { data, error } = await supabase
    .from(PIECE_PERSISTENCE_TABLES.edges)
    .upsert(
      {
        piece_id: pieceId,
        entity_id: input.entityId,
        entity_type: input.entityType,
        payload: input.payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'piece_id,entity_id' },
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function loadPieceEdges(pieceId: string): Promise<PieceEdgeRecord[]> {
  assertPieceId(pieceId);
  const { data, error } = await supabase
    .from(PIECE_PERSISTENCE_TABLES.edges)
    .select('*')
    .eq('piece_id', pieceId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    pieceId: row.piece_id as string,
    entityId: row.entity_id as string,
    entityType: row.entity_type as PieceEntityType,
    payload: (row.payload ?? {}) as Record<string, unknown>,
  }));
}
