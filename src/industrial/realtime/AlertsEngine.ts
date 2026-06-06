import { STATION_LABELS, type IndustrialStation } from '@/industrial/work-orders/types';

import { isRtoEngineEnabled } from './config';
import { industrialRealtimeGateway } from './IndustrialRealtimeGateway';
import { getRealtimeAlertsConfig } from './realtimeAlertsConfigStore';
import type { RtoAlertPayload, RtoHeartbeatPayload, RtoQualityPayload, RtoTaskPayload } from './types';

interface StationCounters {
  pending: number;
  inProgress: number;
  rejected: number;
  rework: number;
  completed: number;
  lastActivityAt: number;
}

/**
 * Motor de alertas industriais em tempo real.
 * Avalia eventos RTO e emite alert.critical para a UI.
 */
class AlertsEngine {
  private started = false;
  private tasks = new Map<string, RtoTaskPayload>();
  private stationCounters = new Map<IndustrialStation, StationCounters>();
  private stationOnline = new Map<IndustrialStation, boolean>();
  private emitted = new Set<string>();

  start(): () => void {
    if (!isRtoEngineEnabled() || this.started) {
      return () => this.stop();
    }

    this.started = true;
    industrialRealtimeGateway.connect();

    const unsubs = [
      industrialRealtimeGateway.on<RtoTaskPayload>('task.updated', (task) => this.onTaskUpdated(task)),
      industrialRealtimeGateway.on<RtoQualityPayload>('quality.event', (q) => this.onQualityEvent(q)),
      industrialRealtimeGateway.on<RtoHeartbeatPayload>('heartbeat.status', (h) => this.onHeartbeat(h)),
    ];

    const interval = setInterval(() => this.evaluateIdleProduction(), 60_000);

    return () => {
      unsubs.forEach((u) => u());
      clearInterval(interval);
      this.stop();
    };
  }

  private stop(): void {
    this.started = false;
    this.emitted.clear();
  }

  private onHeartbeat(payload: RtoHeartbeatPayload): void {
    if (!payload.station) return;
    this.stationOnline.set(payload.station, payload.online);
    if (!payload.online) {
      this.emitOnce(`station-stopped-${payload.station}`, {
        id: `alert-station-stopped-${payload.station}`,
        level: 'error',
        title: 'Estação parada',
        message: `${STATION_LABELS[payload.station]} reportada como parada.`,
        createdAt: new Date().toISOString(),
        station: payload.station,
        source: 'alerts-engine',
        alertCode: 'station_stopped',
      });
    }
  }

  private onTaskUpdated(task: RtoTaskPayload): void {
    this.tasks.set(task.id, task);
    const station = task.station;
    if (station) {
      this.rebuildStationCounters(station);
      this.checkQueueFull(station);
      this.checkRejectionLimit(station);
      this.checkReworkRate(station);
    }
    this.checkTaskDelay(task);
    this.checkInactiveOperator(task);
  }

  private onQualityEvent(quality: RtoQualityPayload): void {
    if (quality.decision === 'rejected') {
      this.emitOnce(`quality-reject-${quality.pieceId ?? quality.createdAt}`, {
        id: `alert-quality-${quality.pieceId ?? Date.now()}`,
        level: 'error',
        title: 'Rejeição de qualidade',
        message: `Peça ${quality.pieceId ?? '—'} rejeitada na inspecção.`,
        createdAt: quality.createdAt,
        station: quality.station,
        pieceId: quality.pieceId,
        source: 'alerts-engine',
        alertCode: 'quality_rejection',
      });
    }
  }

  private rebuildStationCounters(station: IndustrialStation): void {
    const stationTasks = Array.from(this.tasks.values()).filter((t) => t.station === station);
    const counters: StationCounters = {
      pending: stationTasks.filter((t) => t.status === 'pending').length,
      inProgress: stationTasks.filter((t) => t.status === 'in_progress').length,
      rejected: stationTasks.filter((t) => t.status === 'rejected').length,
      rework: stationTasks.filter((t) => t.status === 'rejected' || t.raw?.rework).length,
      completed: stationTasks.filter((t) => t.status === 'completed').length,
      lastActivityAt: Date.now(),
    };
    this.stationCounters.set(station, counters);
  }

  private checkTaskDelay(task: RtoTaskPayload): void {
    if (task.status !== 'in_progress') return;
    const startedAt = task.raw.started_at ?? task.raw.startedAt;
    if (!startedAt) return;
    const minutes = (Date.now() - new Date(String(startedAt)).getTime()) / 60_000;
    if (minutes < getRealtimeAlertsConfig().taskDelayMinutes) return;

    this.emitOnce(`task-delay-${task.id}`, {
      id: `alert-delay-${task.id}`,
      level: 'warning',
      title: 'Atraso de tarefa',
      message: `Tarefa ${task.pieceId} em execução há ${Math.round(minutes)} min.`,
      createdAt: new Date().toISOString(),
      station: task.station,
      pieceId: task.pieceId,
      source: 'alerts-engine',
      alertCode: 'task_delay',
    });
  }

  private checkQueueFull(station: IndustrialStation): void {
    const counters = this.stationCounters.get(station);
    if (!counters) return;
    const queueSize = counters.pending + counters.inProgress;
    if (queueSize < getRealtimeAlertsConfig().maxQueueSize) return;

    this.emitOnce(`queue-full-${station}`, {
      id: `alert-queue-${station}`,
      level: 'warning',
      title: 'Fila cheia',
      message: `${STATION_LABELS[station]}: ${queueSize} tarefas na fila.`,
      createdAt: new Date().toISOString(),
      station,
      source: 'alerts-engine',
      alertCode: 'queue_full',
    });
  }

  private checkRejectionLimit(station: IndustrialStation): void {
    const counters = this.stationCounters.get(station);
    if (!counters) return;
    const total = counters.pending + counters.inProgress + counters.completed + counters.rejected;
    if (total === 0) return;
    const rate = (counters.rejected / total) * 100;
    if (rate < getRealtimeAlertsConfig().rejectionLimitPercent) return;

    this.emitOnce(`rejection-rate-${station}`, {
      id: `alert-rejection-${station}`,
      level: 'error',
      title: 'Rejeições acima do limite',
      message: `${STATION_LABELS[station]}: ${Math.round(rate)}% de rejeições.`,
      createdAt: new Date().toISOString(),
      station,
      source: 'alerts-engine',
      alertCode: 'rejection_limit',
    });
  }

  private checkReworkRate(station: IndustrialStation): void {
    const counters = this.stationCounters.get(station);
    if (!counters) return;
    const total = counters.pending + counters.inProgress + counters.completed + counters.rework;
    if (total === 0) return;
    const rate = (counters.rework / total) * 100;
    if (rate < getRealtimeAlertsConfig().reworkLimitPercent) return;

    this.emitOnce(`rework-rate-${station}`, {
      id: `alert-rework-${station}`,
      level: 'warning',
      title: 'Rework acima do normal',
      message: `${STATION_LABELS[station]}: ${Math.round(rate)}% em rework.`,
      createdAt: new Date().toISOString(),
      station,
      source: 'alerts-engine',
      alertCode: 'rework_high',
    });
  }

  private checkInactiveOperator(task: RtoTaskPayload): void {
    if (task.status !== 'in_progress') return;
    const operatorId = task.raw.operator_id ?? task.raw.operatorId;
    if (operatorId) return;

    this.emitOnce(`operator-inactive-${task.id}`, {
      id: `alert-operator-${task.id}`,
      level: 'info',
      title: 'Operador inactivo',
      message: `Tarefa ${task.pieceId} em execução sem operador atribuído.`,
      createdAt: new Date().toISOString(),
      station: task.station,
      pieceId: task.pieceId,
      source: 'alerts-engine',
      alertCode: 'operator_inactive',
    });
  }

  private evaluateIdleProduction(): void {
    const now = Date.now();
    for (const [station, counters] of this.stationCounters) {
      const idleMinutes = (now - counters.lastActivityAt) / 60_000;
      const isOnline = this.stationOnline.get(station) ?? false;
      if (!isOnline || idleMinutes < getRealtimeAlertsConfig().idleProductionMinutes) continue;
      if (counters.inProgress > 0) continue;

      this.emitOnce(`idle-production-${station}`, {
        id: `alert-idle-${station}`,
        level: 'warning',
        title: 'Ausência de produção',
        message: `${STATION_LABELS[station]} sem produção há ${Math.round(idleMinutes)} min.`,
        createdAt: new Date().toISOString(),
        station,
        source: 'alerts-engine',
        alertCode: 'idle_production',
      });
    }
  }

  private emitOnce(key: string, alert: RtoAlertPayload): void {
    if (this.emitted.has(key)) return;
    this.emitted.add(key);
    industrialRealtimeGateway.dispatch('alert.critical', alert);
  }
}

export const alertsEngine = new AlertsEngine();
