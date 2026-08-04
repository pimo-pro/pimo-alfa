import { useCallback, useEffect, useState } from 'react';

import { fetchWorkOrders } from '@/industrial/api/workOrderActions';
import type { IndustrialStation, IndustrialWorkOrder } from '@/industrial/work-orders/types';

export function useWorkOrders(filters?: {
  projectCode?: string;
  station?: IndustrialStation;
  /** Lista de gestão inclui canceladas; default true nesta página. */
  includeCancelled?: boolean;
}) {
  const [orders, setOrders] = useState<IndustrialWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const includeCancelled = filters?.includeCancelled !== false;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorkOrders({
        projectCode: filters?.projectCode,
        station: filters?.station,
        includeCancelled,
      });
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar ordens.');
    } finally {
      setLoading(false);
    }
  }, [filters?.projectCode, filters?.station, includeCancelled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { orders, loading, error, reload };
}
