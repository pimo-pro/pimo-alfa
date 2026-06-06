import { supabase } from '@/industrial/infra/db';

import { PIECE_PERSISTENCE_TABLES } from '../tables';
import { assertPieceId } from '../shared/validation';
import type { PieceTimeRecord } from '../shared/types';

export async function savePieceTimeTracking(pieceId: string, payload: Record<string, unknown>) {
  assertPieceId(pieceId);
  if (!payload || typeof payload !== 'object') throw new Error('Payload de tempo inválido.');

  const { data, error } = await supabase
    .from(PIECE_PERSISTENCE_TABLES.timeEntries)
    .insert({
      piece_id: pieceId,
      payload,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function loadPieceTimeTracking(pieceId: string): Promise<PieceTimeRecord[]> {
  assertPieceId(pieceId);
  const { data, error } = await supabase
    .from(PIECE_PERSISTENCE_TABLES.timeEntries)
    .select('*')
    .eq('piece_id', pieceId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    pieceId: row.piece_id as string,
    payload: (row.payload ?? {}) as Record<string, unknown>,
  }));
}
