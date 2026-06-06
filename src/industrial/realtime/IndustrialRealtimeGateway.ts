import { supabase } from '@/industrial/infra/db';
import { PIECE_PERSISTENCE_TABLES } from '@/industrial/persistence/tables';
import { WORK_ORDER_TABLES } from '@/industrial/persistence/work-orders/tables';
import type { IndustrialStation } from '@/industrial/work-orders/types';

import { isRtoEngineEnabled, RTO_BROADCAST_CHANNEL } from './config';
import type {
  RtoBroadcastEnvelope,
  RtoEventHandler,
  RtoEventType,
  RtoPiecePayload,
  RtoQualityPayload,
  RtoTaskPayload,
  RtoTimePayload,
} from './types';

type ListenerMap = Map<RtoEventType, Set<RtoEventHandler>>;

function asStation(value: unknown): IndustrialStation | undefined {
  if (typeof value !== 'string') return undefined;
  const stations = ['warehouse', 'nesting', 'drill', 'orlar', 'montagem', 'embalagem'] as const;
  return stations.includes(value as IndustrialStation) ? (value as IndustrialStation) : undefined;
}

function rowToTaskPayload(row: Record<string, unknown>): RtoTaskPayload {
  const operationType = String(row.operation_type ?? row.operationType ?? '');
  return {
    id: String(row.id ?? ''),
    workOrderId: String(row.work_order_id ?? row.workOrderId ?? ''),
    pieceId: String(row.piece_id ?? row.pieceId ?? ''),
    operationType,
    status: String(row.status ?? 'pending'),
    station: asStation(operationType) ?? asStation(row.station),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString()),
    raw: row,
  };
}

/**
 * Gateway WebSocket único (Supabase Realtime) — leitura + broadcast.
 * Sem escrita na BD; não altera core nem infra.
 */
class IndustrialRealtimeGateway {
  private listeners: ListenerMap = new Map();
  private refCount = 0;
  private connected = false;
  private broadcastChannel: ReturnType<typeof supabase.channel> | null = null;
  private pgChannels: ReturnType<typeof supabase.channel>[] = [];

  get isConnected(): boolean {
    return this.connected;
  }

  connect(): void {
    if (!isRtoEngineEnabled()) return;
    this.refCount += 1;
    if (this.connected) return;

    this.setupPostgresSubscriptions();
    this.setupBroadcastChannel();
    this.connected = true;
    this.dispatch('gateway.connected', { at: new Date().toISOString() });
  }

  disconnect(): void {
    if (!this.connected) return;
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount > 0) return;

    for (const channel of this.pgChannels) {
      void supabase.removeChannel(channel);
    }
    this.pgChannels = [];

    if (this.broadcastChannel) {
      void supabase.removeChannel(this.broadcastChannel);
      this.broadcastChannel = null;
    }

    this.connected = false;
    this.dispatch('gateway.disconnected', { at: new Date().toISOString() });
  }

  on<T = unknown>(event: RtoEventType, handler: RtoEventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as RtoEventHandler);
    return () => this.off(event, handler as RtoEventHandler);
  }

  off(event: RtoEventType, handler: RtoEventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  /** Emissão interna / entre adaptadores RTO (sem escrita BD). */
  dispatch(event: RtoEventType, payload: unknown): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch {
        /* isolamento de handlers */
      }
    }
  }

  /** Broadcast Supabase (chat, heartbeat, typing). */
  sendBroadcast(type: string, payload: Record<string, unknown>): void {
    if (!this.broadcastChannel) return;
    const envelope: RtoBroadcastEnvelope = { type, payload };
    void this.broadcastChannel.send({
      type: 'broadcast',
      event: 'rto',
      payload: envelope,
    });
  }

  private setupBroadcastChannel(): void {
    this.broadcastChannel = supabase
      .channel(RTO_BROADCAST_CHANNEL)
      .on('broadcast', { event: 'rto' }, ({ payload }) => {
        const envelope = payload as RtoBroadcastEnvelope;
        if (!envelope?.type) return;
        this.handleBroadcast(envelope);
      })
      .subscribe();
  }

  private handleBroadcast(envelope: RtoBroadcastEnvelope): void {
    switch (envelope.type) {
      case 'heartbeat.ping':
        this.dispatch('heartbeat.status', envelope.payload);
        break;
      case 'chat.message':
      case 'chat.typing':
      case 'chat.read':
        this.dispatch('chat.message', envelope.payload);
        break;
      default:
        break;
    }
  }

  private setupPostgresSubscriptions(): void {
    const taskHandler = (row: Record<string, unknown>) => {
      const task = rowToTaskPayload(row);
      this.dispatch('task.updated', task);
      const piece: RtoPiecePayload = {
        pieceId: task.pieceId,
        station: task.station,
        status: task.status,
        workOrderId: task.workOrderId,
        updatedAt: task.updatedAt,
      };
      this.dispatch('piece.updated', piece);
      if (task.station) {
        this.dispatch('station.updated', {
          station: task.station,
          updatedAt: task.updatedAt,
        });
      }
    };

    const tables: Array<{ table: string; handler: (row: Record<string, unknown>) => void }> = [
      { table: WORK_ORDER_TABLES.tasks, handler: taskHandler },
      { table: WORK_ORDER_TABLES.events, handler: (row) => this.dispatch('time.event', this.mapTimeEvent(row)) },
      { table: PIECE_PERSISTENCE_TABLES.quality, handler: (row) => this.dispatch('quality.event', this.mapQualityEvent(row)) },
      { table: PIECE_PERSISTENCE_TABLES.timeEntries, handler: (row) => this.dispatch('time.event', this.mapTimeEntry(row)) },
      { table: PIECE_PERSISTENCE_TABLES.systemEvents, handler: (row) => this.dispatch('time.event', this.mapSystemEvent(row)) },
      { table: WORK_ORDER_TABLES.orders, handler: (row) => {
        const station = asStation(row.station);
        if (station) {
          this.dispatch('station.updated', { station, updatedAt: String(row.updated_at ?? new Date().toISOString()) });
        }
      }},
    ];

    for (const { table, handler } of tables) {
      const channel = supabase
        .channel(`rto:pg:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown> | null;
          if (row) handler(row);
        })
        .subscribe();
      this.pgChannels.push(channel);
    }
  }

  private mapQualityEvent(row: Record<string, unknown>): RtoQualityPayload {
    return {
      pieceId: row.piece_id ? String(row.piece_id) : undefined,
      station: asStation(row.station),
      decision: String(row.decision ?? 'unknown'),
      eventType: 'quality_inspection',
      createdAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    };
  }

  private mapTimeEntry(row: Record<string, unknown>): RtoTimePayload {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    return {
      pieceId: row.piece_id ? String(row.piece_id) : undefined,
      station: asStation(row.station),
      eventType: 'time_entry',
      active: !payload.stoppedAt && !payload.stopped_at,
      createdAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    };
  }

  private mapTimeEvent(row: Record<string, unknown>): RtoTimePayload {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    return {
      pieceId: undefined,
      station: asStation(meta.station ?? row.station),
      eventType: String(row.event_type ?? row.type ?? 'work_order_event'),
      active: true,
      createdAt: String(row.created_at ?? new Date().toISOString()),
    };
  }

  private mapSystemEvent(row: Record<string, unknown>): RtoTimePayload {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    return {
      pieceId: meta.pieceId ? String(meta.pieceId) : meta.piece_id ? String(meta.piece_id) : undefined,
      station: asStation(meta.station),
      eventType: String(row.type ?? 'system_event'),
      active: false,
      createdAt: String(row.created_at ?? new Date().toISOString()),
    };
  }
}

export const industrialRealtimeGateway = new IndustrialRealtimeGateway();
