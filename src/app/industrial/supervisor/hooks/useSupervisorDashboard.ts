import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { loadSupervisorDashboardSnapshot } from '@/industrial/persistence/supervisor/loadSupervisorData';
import type { SupervisorAlertItem, SupervisorDashboardSnapshot } from '@/industrial/persistence/supervisor/types';
import { useIndustrialRealtime } from '@/industrial/realtime';
import { INDUSTRIAL_STATIONS, type IndustrialStation } from '@/industrial/work-orders/types';
import { useIndustrialPageState } from '@/industrial/ui/components';

export type SupervisorMainMode = 'canvas' | 'chat' | 'info' | 'alerts';
export type SupervisorRailView = 'overview' | 'stations' | 'projects' | 'quality' | 'time' | 'chat' | 'alerts';

export function useSupervisorDashboard() {
  useIndustrialPageState();
  const [searchParams] = useSearchParams();
  const stationFromQuery = searchParams.get('station');
  const pieceFromQuery = searchParams.get('piece');

  const [snapshot, setSnapshot] = useState<SupervisorDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainMode, setMainMode] = useState<SupervisorMainMode>('canvas');
  const [railView, setRailView] = useState<SupervisorRailView>('overview');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<IndustrialStation | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [detailModal, setDetailModal] = useState<{ title: string; body: string } | null>(null);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reloadRef = useRef<() => Promise<void>>(async () => undefined);

  const scheduleReload = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      void reloadRef.current();
    }, 800);
  }, []);

  const realtime = useIndustrialRealtime({
    mode: 'supervisor',
    onDataRefresh: scheduleReload,
  });

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadSupervisorDashboardSnapshot();
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar supervisor.');
    } finally {
      setLoading(false);
    }
  }, []);

  reloadRef.current = reload;

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (stationFromQuery && INDUSTRIAL_STATIONS.includes(stationFromQuery as IndustrialStation)) {
      setSelectedStation(stationFromQuery as IndustrialStation);
      setRailView('stations');
      setMainMode('info');
    }
  }, [stationFromQuery]);

  useEffect(() => {
    if (!pieceFromQuery || !snapshot) return;
    const task =
      snapshot.tasks.find((t) => t.pieceId === pieceFromQuery) ??
      snapshot.tasks.find((t) => t.display?.nqrCode === pieceFromQuery);
    if (task) setSelectedTaskId(task.id);
  }, [pieceFromQuery, snapshot]);

  const alerts = useMemo(() => {
    const snapshotAlerts = snapshot?.alerts ?? [];
    const merged = [...realtime.realtimeAlerts, ...snapshotAlerts];
    const seen = new Set<string>();
    const unique = merged.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
    return unique.filter((a) => !dismissedAlerts.includes(a.id));
  }, [snapshot?.alerts, realtime.realtimeAlerts, dismissedAlerts]);

  const filteredTasks = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.tasks.filter((task) => {
      if (selectedProjectId) {
        const order = snapshot.orders.find((o) => o.id === task.workOrderId);
        if (order?.projectId !== selectedProjectId) return false;
      }
      if (selectedStation && task.operationType !== selectedStation) return false;
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      return true;
    });
  }, [snapshot, selectedProjectId, selectedStation, statusFilter]);

  const selectedTask = useMemo(
    () => snapshot?.tasks.find((t) => t.id === selectedTaskId) ?? null,
    [snapshot?.tasks, selectedTaskId],
  );

  const openDetail = useCallback((title: string, body: string) => {
    setDetailModal({ title, body });
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setDismissedAlerts((prev) => [...prev, id]);
  }, []);

  const selectRail = useCallback((view: SupervisorRailView) => {
    setRailView(view);
    if (view === 'chat') setMainMode('chat');
    else if (view === 'alerts') setMainMode('alerts');
    else if (view === 'overview') setMainMode('canvas');
    else setMainMode('info');
  }, []);

  return {
    snapshot,
    loading,
    error,
    mainMode,
    setMainMode,
    railView,
    selectRail,
    selectedProjectId,
    setSelectedProjectId,
    selectedStation,
    setSelectedStation,
    selectedTaskId,
    setSelectedTaskId,
    statusFilter,
    setStatusFilter,
    filteredTasks,
    selectedTask,
    alerts,
    notificationsOpen,
    setNotificationsOpen,
    dismissAlert,
    detailModal,
    setDetailModal,
    openDetail,
    reload,
    realtimeConnected: realtime.connected,
    stationStatuses: realtime.stationStatuses,
    canvasRevision: realtime.canvasRevision,
    lastThreeSync: realtime.lastThreeSync,
    typingUsers: realtime.typingUsers,
    sendRealtimeChat: realtime.sendChatMessage,
    sendRealtimeTyping: realtime.sendTyping,
    mergeChatConversations: realtime.mergeChatConversations,
  };
}

export type UseSupervisorDashboardReturn = ReturnType<typeof useSupervisorDashboard>;

export function filterAlertsByLevel(alerts: SupervisorAlertItem[], level?: SupervisorAlertItem['level']) {
  if (!level) return alerts;
  return alerts.filter((a) => a.level === level);
}
