import { supabase } from '@/industrial/infra/db';
import type { QualityDecision } from '@/industrial/core/quality/types';

import { PIECE_PERSISTENCE_TABLES } from '../tables';
import { assertPieceId } from '../shared/validation';
import type { PieceQualityRecord } from '../shared/types';

export interface SavePieceQualityInput {
  decision: QualityDecision;
  payload?: Record<string, unknown>;
}

export async function savePieceQuality(pieceId: string, input: SavePieceQualityInput) {
  assertPieceId(pieceId);
  if (!input.decision) throw new Error('Decisão de qualidade inválida.');

  const { data, error } = await supabase
    .from(PIECE_PERSISTENCE_TABLES.quality)
    .insert({
      piece_id: pieceId,
      decision: input.decision,
      payload: input.payload ?? {},
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function loadPieceQuality(pieceId: string): Promise<PieceQualityRecord[]> {
  assertPieceId(pieceId);
  const { data, error } = await supabase
    .from(PIECE_PERSISTENCE_TABLES.quality)
    .select('*')
    .eq('piece_id', pieceId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    pieceId: row.piece_id as string,
    decision: row.decision as QualityDecision,
    payload: (row.payload ?? {}) as Record<string, unknown>,
  }));
}
