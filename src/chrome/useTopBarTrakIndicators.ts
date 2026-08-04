import { useCallback, useEffect, useState } from 'react';

import {
  fetchStationTasks,
  fetchWorkOrderDetail,
  fetchWorkOrders,
} from '@/industrial/api/workOrderActions';
import { loadTasksByWorkOrderIds } from '@/industrial/persistence/work-orders/loadWorkOrders';
import { industrialRealtimeGateway } from '@/industrial/realtime';
import { isRtoEngineEnabled } from '@/industrial/realtime/config';
import type { IndustrialStation } from '@/industrial/work-orders/types';

export type TopBarTrakIndicators = {
  activeTasks: number;
  orders: number;
  online: boolean;
  loading: boolean;
};

type Options = {
  station?: IndustrialStation;
  workOrderId?: string;
};

/**
 * Indicadores reais para TopBarTrak — sem useIndustrialRealtime
 * (evita heartbeat duplicado; usa refCount do gateway).
 */
export function useTopBarTrakIndicators(options: Options = {}): TopBarTrakIndicators {
  const { station, workOrderId } = options;
  const [activeTasks, setActiveTasks] = useState(0);
  const [orders, setOrders] = useState(0);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (workOrderId) {
        const detail = await fetchWorkOrderDetail(workOrderId);
        const tasks = detail.tasks ?? [];
        setOrders(detail.order ? 1 : 0);
        setActiveTasks(
          tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length,
        );
        return;
      }

      const woList = await fetchWorkOrders(station ? { station } : undefined);
      setOrders(woList.length);

      if (station) {
        const tasks = await fetchStationTasks(station);
        setActiveTasks(
          tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length,
        );
      } else {
        const tasks = await loadTasksByWorkOrderIds(woList.map((wo) => wo.id));
        setActiveTasks(
          tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length,
        );
      }
    } catch {
      setActiveTasks(0);
      setOrders(0);
    } finally {
      setLoading(false);
    }
  }, [station, workOrderId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!isRtoEngineEnabled()) {
      setOnline(false);
      return;
    }

    industrialRealtimeGateway.connect();
    setOnline(industrialRealtimeGateway.isConnected);

    const unsubs = [
      industrialRealtimeGateway.on('gateway.connected', () => setOnline(true)),
      industrialRealtimeGateway.on('gateway.disconnected', () => setOnline(false)),
      industrialRealtimeGateway.on('task.updated', () => {
        void reload();
      }),
      industrialRealtimeGateway.on('piece.updated', () => {
        void reload();
      }),
    ];

    if (station) {
      unsubs.push(
        industrialRealtimeGateway.on<{ station: IndustrialStation; online: boolean }>(
          'heartbeat.status',
          (payload) => {
            if (payload.station === station) setOnline(payload.online);
          },
        ),
      );
    }

    return () => {
      unsubs.forEach((u) => u());
      industrialRealtimeGateway.disconnect();
    };
  }, [station, reload]);

  return { activeTasks, orders, online, loading };
}
