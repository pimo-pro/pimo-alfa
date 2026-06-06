import { logPieceEvent as logUiPieceEvent } from '../events/logEvent';
import type { PieceEventPayload } from '../shared/types';

export async function savePieceEvents(pieceId: string, payload: PieceEventPayload) {
  return logUiPieceEvent(pieceId, payload);
}
