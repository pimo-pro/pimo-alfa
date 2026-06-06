import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SupervisorDashboardSnapshot } from '@/industrial/persistence/supervisor/types';
import { INDUSTRIAL_STATIONS, type IndustrialStation } from '@/industrial/work-orders/types';

import { industrialRealtimeGateway } from '../IndustrialRealtimeGateway';
import type { RtoQualityPayload, RtoTaskPayload, RtoTimePayload } from '../types';

export interface RealtimeKpiState {
  productionPending: number;
  productionRunning: number;
  productionCompleted: number;
  rejectionRatePct: number;
  reworkEvents: number;
  activeSessions: number;
  delayedTasks: number;
  stationLoad: Record<IndustrialStation, { pending: number; inProgress: number; loadPct: number }>;
  projectProgress: Record<string, { completed: number; total: number; progressPct: number }>;
  lastUpdatedAt: string;
}

function buildInitialKpis(snapshot: SupervisorDashboardSnapshot | null): RealtimeKpiState {
  const tasks = snapshot?.tasks ?? [];
  const stationKpis = snapshot?.stationKpis ?? [];
  const projectKpis = snapshot?.projectKpis ?? [];

  const stationLoad = INDUSTRIAL_STATIONS.reduce(
    (acc, station) => {
      const kpi = stationKpis.find((s) => s.station === station);
      const pending = kpi?.pending ?? 0;
      const inProgress = kpi?.inProgress ?? 0;
      const total = kpi?.total ?? 0;
      acc[station] = {
        pending,
        inProgress,
        loadPct: total > 0 ? Math.round(((pending + inProgress) / total) * 100) : 0,
      };
      return acc;
    },
    {} as RealtimeKpiState['stationLoad'],
  );

  const projectProgress = projectKpis.reduce(
    (acc, p) => {
      acc[p.projectId] = {
        completed: p.completed,
        total: p.totalTasks,
        progressPct: p.progressPct,
      };
      return acc;
    },
    {} as RealtimeKpiState['projectProgress'],
  );

  return {
    productionPending: tasks.filter((t) => t.status === 'pending').length,
    productionRunning: tasks.filter((t) => t.status === 'in_progress').length,
    productionCompleted: tasks.filter((t) => t.status === 'completed').length,
    rejectionRatePct: snapshot?.qualityKpi.rejectionRatePct ?? 0,
    reworkEvents: snapshot?.qualityKpi.reworkEvents ?? 0,
    activeSessions: snapshot?.timeKpi.activeSessions ?? 0,
    delayedTasks: snapshot?.timeKpi.delayedTasks ?? 0,
    stationLoad,
    projectProgress,
    lastUpdatedAt: snapshot?.loadedAt ?? new Date().toISOString(),
  };
}

/**
 * Hook de KPIs dinâmicos — actualiza sem refresh da página.
 */
export function useRealtimeKpis(snapshot: SupervisorDashboardSnapshot | null) {
  const [kpis, setKpis] = useState<RealtimeKpiState>(() => buildInitialKpis(snapshot));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setKpis(buildInitialKpis(snapshot));
  }, [snapshot]);

  const applyTaskUpdate = useCallback((task: RtoTaskPayload) => {
    setKpis((prev) => {
      const station = task.station;
      const next = { ...prev, lastUpdatedAt: new Date().toISOString() };

      if (task.status === 'pending') {
        next.productionPending = prev.productionPending + 1;
      } else if (task.status === 'in_progress') {
        next.productionRunning = prev.productionRunning + 1;
        next.productionPending = Math.max(0, prev.productionPending - 1);
      } else if (task.status === 'completed') {
        next.productionCompleted = prev.productionCompleted + 1;
        next.productionRunning = Math.max(0, prev.productionRunning - 1);
      } else if (task.status === 'rejected') {
        next.productionRunning = Math.max(0, prev.productionRunning - 1);
        next.reworkEvents = prev.reworkEvents + 1;
      }

      if (station && next.stationLoad[station]) {
        const load = { ...next.stationLoad[station] };
        if (task.status === 'pending') load.pending += 1;
        if (task.status === 'in_progress') {
          load.inProgress += 1;
          load.pending = Math.max(0, load.pending - 1);
        }
        if (task.status === 'completed' || task.status === 'rejected') {
          load.inProgress = Math.max(0, load.inProgress - 1);
        }
        const total = load.pending + load.inProgress + load.loadPct;
        load.loadPct = total > 0 ? Math.round(((load.pending + load.inProgress) / total) * 100) : load.loadPct;
        next.stationLoad = { ...next.stationLoad, [station]: load };
      }

      return next;
    });
    setTick((t) => t + 1);
  }, []);

  const applyQualityUpdate = useCallback((quality: RtoQualityPayload) => {
    if (quality.decision !== 'rejected') return;
    setKpis((prev) => ({
      ...prev,
      rejectionRatePct: Math.min(100, prev.rejectionRatePct + 1),
      lastUpdatedAt: new Date().toISOString(),
    }));
    setTick((t) => t + 1);
  }, []);

  const applyTimeUpdate = useCallback((time: RtoTimePayload) => {
    setKpis((prev) => ({
      ...prev,
      activeSessions: time.active ? prev.activeSessions + 1 : Math.max(0, prev.activeSessions - 1),
      delayedTasks: time.eventType.includes('delay') ? prev.delayedTasks + 1 : prev.delayedTasks,
      lastUpdatedAt: new Date().toISOString(),
    }));
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    industrialRealtimeGateway.connect();
    const unsubs = [
      industrialRealtimeGateway.on<RtoTaskPayload>('task.updated', applyTaskUpdate),
      industrialRealtimeGateway.on<RtoQualityPayload>('quality.event', applyQualityUpdate),
      industrialRealtimeGateway.on<RtoTimePayload>('time.event', applyTimeUpdate),
    ];
    return () => {
      unsubs.forEach((u) => u());
      industrialRealtimeGateway.disconnect();
    };
  }, [applyTaskUpdate, applyQualityUpdate, applyTimeUpdate]);

  const live = useMemo(() => ({ ...kpis, tick }), [kpis, tick]);

  return live;
}
