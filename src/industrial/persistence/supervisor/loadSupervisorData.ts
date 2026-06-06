import { supabase } from '@/industrial/infra/db';
import { PIECE_PERSISTENCE_TABLES } from '@/industrial/persistence/tables';
import { mapTaskRow, mapWorkOrderRow } from '@/industrial/persistence/work-orders/mappers';
import { WORK_ORDER_TABLES } from '@/industrial/persistence/work-orders/tables';
import {
  INDUSTRIAL_STATIONS,
  STATION_LABELS,
  type IndustrialStation,
  type IndustrialWorkOrderTask,
} from '@/industrial/work-orders/types';

import type {
  SupervisorAlertItem,
  SupervisorDashboardSnapshot,
  SupervisorOperatorKpi,
  SupervisorProjectKpi,
  SupervisorQualityKpi,
  SupervisorStationKpi,
  SupervisorSystemEventRow,
  SupervisorTimeKpi,
} from './types';

function emptyStationMap(): Record<IndustrialStation, number> {
  return INDUSTRIAL_STATIONS.reduce(
    (acc, station) => {
      acc[station] = 0;
      return acc;
    },
    {} as Record<IndustrialStation, number>,
  );
}

function buildStationKpis(tasks: IndustrialWorkOrderTask[]): SupervisorStationKpi[] {
  return INDUSTRIAL_STATIONS.map((station) => {
    const stationTasks = tasks.filter((task) => task.operationType === station || task.metadata?.station === station);
    const byOrderStation = tasks.filter((task) => {
      return task.operationType === station;
    });
    const scoped = stationTasks.length > 0 ? stationTasks : byOrderStation;
    const rework = scoped.filter((t) => t.status === 'rejected' || t.metadata?.rework).length;
    return {
      station,
      pending: scoped.filter((t) => t.status === 'pending').length,
      inProgress: scoped.filter((t) => t.status === 'in_progress').length,
      completed: scoped.filter((t) => t.status === 'completed').length,
      rejected: scoped.filter((t) => t.status === 'rejected').length,
      rework,
      total: scoped.length,
    };
  });
}

function buildProjectKpis(
  orders: SupervisorDashboardSnapshot['orders'],
  tasks: IndustrialWorkOrderTask[],
): SupervisorProjectKpi[] {
  const projectIds = Array.from(new Set(orders.map((o) => o.projectId)));
  return projectIds.map((projectId) => {
    const projectTasks = tasks.filter((task) =>
      orders.some((order) => order.projectId === projectId && order.id === task.workOrderId),
    );
    const completed = projectTasks.filter((t) => t.status === 'completed').length;
    const rejected = projectTasks.filter((t) => t.status === 'rejected').length;
    const total = projectTasks.length;
    const criticalPieces = projectTasks
      .filter((t) => t.status === 'rejected' || t.status === 'in_progress')
      .map((t) => t.pieceId)
      .slice(0, 5);
    return {
      projectId,
      totalTasks: total,
      completed,
      rejected,
      progressPct: total > 0 ? Math.round((completed / total) * 100) : 0,
      criticalPieces,
    };
  });
}

function buildOperatorKpis(tasks: IndustrialWorkOrderTask[]): SupervisorOperatorKpi[] {
  const map = new Map<string, SupervisorOperatorKpi>();
  for (const task of tasks) {
    const operatorId = task.operatorId ?? '—';
    const current = map.get(operatorId) ?? {
      operatorId,
      completed: 0,
      rejected: 0,
      errors: 0,
    };
    if (task.status === 'completed') current.completed += 1;
    if (task.status === 'rejected') {
      current.rejected += 1;
      current.errors += 1;
    }
    map.set(operatorId, current);
  }
  return Array.from(map.values()).sort((a, b) => b.completed - a.completed);
}

function buildAlerts(
  tasks: IndustrialWorkOrderTask[],
  events: SupervisorSystemEventRow[],
  orders: SupervisorDashboardSnapshot['orders'],
): SupervisorAlertItem[] {
  const alerts: SupervisorAlertItem[] = [];

  for (const event of events.slice(0, 20)) {
    const meta = event.metadata ?? {};
    const pieceId = String(meta.pieceId ?? meta.piece_id ?? '');
    const station = meta.station as IndustrialStation | undefined;
    const isSuccess =
      event.type.includes('complete') ||
      event.type.includes('confirmed') ||
      event.type === 'task_complete' ||
      meta.success === true;

    alerts.push({
      id: `evt-${event.id}`,
      level: isSuccess ? 'success' : event.type.includes('reject') || event.type.includes('error') ? 'error' : 'warning',
      title: isSuccess ? 'Operação concluída' : 'Evento industrial',
      message:
        pieceId && station
          ? `Peça ${pieceId} registada com sucesso na estação ${STATION_LABELS[station] ?? station}.`
          : event.type,
      createdAt: event.createdAt,
      station,
      projectId: orders.find((o) => o.id === event.workOrderId)?.projectId,
      pieceId: pieceId || undefined,
    });
  }

  const delayed = tasks.filter((t) => t.status === 'in_progress' && t.startedAt);
  for (const task of delayed.slice(0, 5)) {
    const started = task.startedAt ? new Date(task.startedAt).getTime() : 0;
    const minutes = started ? (Date.now() - started) / 60000 : 0;
    if (minutes > 45) {
      alerts.push({
        id: `delay-${task.id}`,
        level: 'warning',
        title: 'Tempo elevado',
        message: `Tarefa ${task.pieceId} em execução há ${Math.round(minutes)} min.`,
        createdAt: new Date().toISOString(),
        pieceId: task.pieceId,
      });
    }
  }

  return alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function loadSupervisorDashboardSnapshot(): Promise<SupervisorDashboardSnapshot> {
  const [ordersRes, tasksRes, woEventsRes, sysEventsRes, qualityRes, timeRes] = await Promise.all([
    supabase.from(WORK_ORDER_TABLES.orders).select('*').order('created_at', { ascending: false }),
    supabase.from(WORK_ORDER_TABLES.tasks).select('*').order('updated_at', { ascending: false }),
    supabase.from(WORK_ORDER_TABLES.events).select('*').order('created_at', { ascending: false }).limit(80),
    supabase.from(PIECE_PERSISTENCE_TABLES.systemEvents).select('*').order('created_at', { ascending: false }).limit(80),
    supabase.from(PIECE_PERSISTENCE_TABLES.quality).select('*').order('updated_at', { ascending: false }).limit(200),
    supabase.from(PIECE_PERSISTENCE_TABLES.timeEntries).select('*').order('updated_at', { ascending: false }).limit(200),
  ]);

  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);
  if (woEventsRes.error) throw new Error(woEventsRes.error.message);
  if (sysEventsRes.error) throw new Error(sysEventsRes.error.message);
  if (qualityRes.error) throw new Error(qualityRes.error.message);
  if (timeRes.error) throw new Error(timeRes.error.message);

  const orders = (ordersRes.data ?? []).map(mapWorkOrderRow);
  const tasks = (tasksRes.data ?? []).map(mapTaskRow);

  const woEvents: SupervisorSystemEventRow[] = (woEventsRes.data ?? []).map((row) => ({
    id: row.id,
    type: row.event_type,
    createdAt: row.created_at,
    workOrderId: row.work_order_id ?? undefined,
    userId: row.operator_id ?? undefined,
    metadata: row.metadata ?? {},
  }));

  const sysEvents: SupervisorSystemEventRow[] = (sysEventsRes.data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    createdAt: row.created_at,
    workOrderId: row.work_order_id ?? undefined,
    userId: row.user_id ?? undefined,
    metadata: row.metadata ?? {},
  }));

  const events = [...woEvents, ...sysEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const qualityRows = qualityRes.data ?? [];
  const rejectedQuality = qualityRows.filter((row) => row.decision === 'rejected' || row.decision === 'rework').length;
  const qualityKpi: SupervisorQualityKpi = {
    inspections: qualityRows.length,
    rejected: qualityRows.filter((row) => row.decision === 'rejected').length,
    reworkEvents: events.filter((e) => e.type.includes('rework')).length,
    rejectionRatePct: qualityRows.length > 0 ? Math.round((rejectedQuality / qualityRows.length) * 100) : 0,
  };

  const timeRows = timeRes.data ?? [];
  const activeSessions = timeRows.filter((row) => {
    const payload = row.payload ?? {};
    return !payload.stoppedAt && !payload.stopped_at;
  }).length;

  const avgMinutesPerStation = emptyStationMap();
  for (const station of INDUSTRIAL_STATIONS) {
    const stationTasks = tasks.filter((t) => t.operationType === station && t.completedAt && t.startedAt);
    if (stationTasks.length === 0) continue;
    const totalMin = stationTasks.reduce((sum, task) => {
      const start = new Date(task.startedAt!).getTime();
      const end = new Date(task.completedAt!).getTime();
      return sum + Math.max(0, (end - start) / 60000);
    }, 0);
    avgMinutesPerStation[station] = Math.round(totalMin / stationTasks.length);
  }

  const timeKpi: SupervisorTimeKpi = {
    activeSessions,
    delayedTasks: tasks.filter((t) => t.status === 'in_progress').length,
    avgMinutesPerStation,
  };

  const stationKpis = buildStationKpis(tasks);
  const projectKpis = buildProjectKpis(orders, tasks);
  const operatorKpis = buildOperatorKpis(tasks);
  const alerts = buildAlerts(tasks, events, orders);

  return {
    orders,
    tasks,
    events,
    stationKpis,
    projectKpis,
    qualityKpi,
    timeKpi,
    operatorKpis,
    alerts,
    loadedAt: new Date().toISOString(),
  };
}
