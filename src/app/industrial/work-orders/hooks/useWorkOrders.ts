import { useCallback, useEffect, useState } from 'react';

import { fetchWorkOrders } from '@/industrial/api/workOrderActions';
import type { IndustrialStation, IndustrialWorkOrder } from '@/industrial/work-orders/types';

export function useWorkOrders(filters?: { projectCode?: string; station?: IndustrialStation }) {
  const [orders, setOrders] = useState<IndustrialWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorkOrders(filters);
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar ordens.');
    } finally {
      setLoading(false);
    }
  }, [filters?.projectCode, filters?.station]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { orders, loading, error, reload };
}
