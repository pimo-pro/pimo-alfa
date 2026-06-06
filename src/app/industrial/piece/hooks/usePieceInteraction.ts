import { useCallback, useState } from 'react';

import { updatePieceEdgeSelection } from '@/industrial/api/pieceActions';

import type { PieceSelectableType, PieceSelection } from '../types';

interface UsePieceInteractionOptions {
  pieceId?: string;
  workOrderId?: string;
  userId?: string;
  onPersisted?: () => void;
}

export function usePieceInteraction(options: UsePieceInteractionOptions = {}) {
  const { pieceId, workOrderId, userId, onPersisted } = options;
  const [selection, setSelection] = useState<PieceSelection | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const selectEntity = useCallback((id: string, type: PieceSelectableType) => {
    setSelection({ id, type });
    setSidebarOpen(true);
    if (pieceId) {
      void updatePieceEdgeSelection(pieceId, {
        entityId: id,
        entityType: type,
        payload: { selectedAt: new Date().toISOString(), workOrderId, userId },
      }).then(() => onPersisted?.());
    }
  }, [onPersisted, pieceId, userId, workOrderId]);

  const saveSelectedPart = useCallback(async () => {
    if (!pieceId || !selection) return;
    await updatePieceEdgeSelection(pieceId, {
      entityId: selection.id,
      entityType: selection.type,
      payload: { savedAt: new Date().toISOString(), workOrderId, userId },
    });
    onPersisted?.();
  }, [onPersisted, pieceId, selection, userId, workOrderId]);

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => !open);
  }, []);

  return {
    selection,
    sidebarOpen,
    selectEntity,
    saveSelectedPart,
    clearSelection,
    toggleSidebar,
    setSidebarOpen,
  };
}
