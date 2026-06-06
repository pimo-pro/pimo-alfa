import { INDUSTRIAL_STATIONS, STATION_LABELS, type IndustrialStation } from '@/industrial/work-orders/types';

import { isRtoEngineEnabled, RTO_HEARTBEAT_INTERVAL_MS, RTO_HEARTBEAT_TIMEOUT_MS } from './config';
import { industrialRealtimeGateway } from './IndustrialRealtimeGateway';
import type { RtoAlertPayload, RtoHeartbeatPayload } from './types';

interface StationHeartbeatState {
  lastSeenAt: number;
  online: boolean;
}

/**
 * Monitoriza heartbeats das estações via broadcast Supabase.
 * >10s sem sinal → alerta vermelho; recuperação → alerta verde.
 */
class StationHeartbeatMonitor {
  private sendTimers = new Map<IndustrialStation, ReturnType<typeof setInterval>>();
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private states = new Map<IndustrialStation, StationHeartbeatState>();
  private monitoring = false;

  startSending(station: IndustrialStation): () => void {
    if (!isRtoEngineEnabled()) return () => undefined;

    this.sendHeartbeat(station);
    const timer = setInterval(() => this.sendHeartbeat(station), RTO_HEARTBEAT_INTERVAL_MS);
    this.sendTimers.set(station, timer);

    return () => {
      clearInterval(timer);
      this.sendTimers.delete(station);
    };
  }

  startMonitoring(): () => void {
    if (!isRtoEngineEnabled()) return () => undefined;
    if (this.monitoring) return () => this.stopMonitoring();

    this.monitoring = true;
    industrialRealtimeGateway.connect();

    const unsub = industrialRealtimeGateway.on<RtoHeartbeatPayload>('heartbeat.status', (payload) => {
      if (!payload.station) return;
      this.recordHeartbeat(payload.station, payload.lastSeenAt);
    });

    for (const station of INDUSTRIAL_STATIONS) {
      this.states.set(station, { lastSeenAt: 0, online: false });
    }

    this.checkTimer = setInterval(() => this.evaluateTimeouts(), 2_000);

    return () => {
      unsub();
      this.stopMonitoring();
    };
  }

  getStationStatus(station: IndustrialStation): { online: boolean; lastSeenAt: string | null } {
    const state = this.states.get(station);
    if (!state) return { online: false, lastSeenAt: null };
    return {
      online: state.online,
      lastSeenAt: state.lastSeenAt > 0 ? new Date(state.lastSeenAt).toISOString() : null,
    };
  }

  getAllStatuses(): Record<IndustrialStation, boolean> {
    return INDUSTRIAL_STATIONS.reduce(
      (acc, station) => {
        acc[station] = this.states.get(station)?.online ?? false;
        return acc;
      },
      {} as Record<IndustrialStation, boolean>,
    );
  }

  private sendHeartbeat(station: IndustrialStation): void {
    industrialRealtimeGateway.connect();
    const now = new Date().toISOString();
    industrialRealtimeGateway.sendBroadcast('heartbeat.ping', {
      station,
      lastSeenAt: now,
      online: true,
    });
    this.recordHeartbeat(station, now);
  }

  private recordHeartbeat(station: IndustrialStation, lastSeenAt: string): void {
    const ts = new Date(lastSeenAt).getTime();
    const prev = this.states.get(station);
    const wasOnline = prev?.online ?? false;
    this.states.set(station, { lastSeenAt: ts, online: true });

    if (!wasOnline && this.monitoring) {
      this.emitRecoveryAlert(station, lastSeenAt);
    }
  }

  private evaluateTimeouts(): void {
    const now = Date.now();
    for (const station of INDUSTRIAL_STATIONS) {
      const state = this.states.get(station);
      if (!state) continue;

      const elapsed = state.lastSeenAt > 0 ? now - state.lastSeenAt : Infinity;
      const shouldBeOnline = elapsed <= RTO_HEARTBEAT_TIMEOUT_MS;

      if (state.online && !shouldBeOnline) {
        state.online = false;
        this.emitOfflineAlert(station);
      }

      industrialRealtimeGateway.dispatch('heartbeat.status', {
        station,
        online: state.online,
        lastSeenAt: state.lastSeenAt > 0 ? new Date(state.lastSeenAt).toISOString() : new Date().toISOString(),
        previousOnline: shouldBeOnline ? false : true,
      } satisfies RtoHeartbeatPayload);
    }
  }

  private emitOfflineAlert(station: IndustrialStation): void {
    const alert: RtoAlertPayload = {
      id: `heartbeat-offline-${station}`,
      level: 'error',
      title: 'Estação offline',
      message: `${STATION_LABELS[station]} sem heartbeat há mais de ${RTO_HEARTBEAT_TIMEOUT_MS / 1000}s.`,
      createdAt: new Date().toISOString(),
      station,
      source: 'heartbeat',
      alertCode: 'station_offline',
    };
    industrialRealtimeGateway.dispatch('alert.critical', alert);
  }

  private emitRecoveryAlert(station: IndustrialStation, lastSeenAt: string): void {
    const alert: RtoAlertPayload = {
      id: `heartbeat-online-${station}-${Date.now()}`,
      level: 'success',
      title: 'Estação online',
      message: `${STATION_LABELS[station]} recuperou ligação.`,
      createdAt: lastSeenAt,
      station,
      source: 'heartbeat',
      alertCode: 'station_online',
    };
    industrialRealtimeGateway.dispatch('alert.critical', alert);
  }

  private stopMonitoring(): void {
    this.monitoring = false;
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }
}

export const stationHeartbeatMonitor = new StationHeartbeatMonitor();
