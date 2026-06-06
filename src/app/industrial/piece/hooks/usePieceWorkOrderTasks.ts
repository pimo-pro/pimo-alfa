import { useCallback, useEffect, useState } from 'react';

import { fetchPieceWorkOrderTasks } from '@/industrial/api/workOrderActions';
import type { IndustrialWorkOrderTask } from '@/industrial/work-orders/types';

export function usePieceWorkOrderTasks(pieceId?: string) {
  const [tasks, setTasks] = useState<IndustrialWorkOrderTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!pieceId) {
      setTasks([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchPieceWorkOrderTasks(pieceId);
      setTasks(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas.');
    } finally {
      setLoading(false);
    }
  }, [pieceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tasks, loading, error, reload };
}
