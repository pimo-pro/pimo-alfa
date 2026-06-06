import type { IndustrialStation } from '@/industrial/work-orders/types';
import type { SupervisorAlertItem } from '@/industrial/persistence/supervisor/types';

/** Eventos emitidos pelo RTO-Engine 1.0 para a camada UI. */
export type RtoEventType =
  | 'task.updated'
  | 'piece.updated'
  | 'station.updated'
  | 'quality.event'
  | 'time.event'
  | 'alert.critical'
  | 'chat.message'
  | 'heartbeat.status'
  | 'three.sync'
  | 'gateway.connected'
  | 'gateway.disconnected';

export type RtoEventHandler<T = unknown> = (payload: T) => void;

export interface RtoTaskPayload {
  id: string;
  workOrderId: string;
  pieceId: string;
  operationType: string;
  status: string;
  station?: IndustrialStation;
  updatedAt: string;
  raw: Record<string, unknown>;
}

export interface RtoPiecePayload {
  pieceId: string;
  station?: IndustrialStation;
  status: string;
  workOrderId?: string;
  updatedAt: string;
}

export interface RtoStationPayload {
  station: IndustrialStation;
  pending: number;
  inProgress: number;
  online: boolean;
  updatedAt: string;
}

export interface RtoQualityPayload {
  pieceId?: string;
  station?: IndustrialStation;
  decision: string;
  eventType: string;
  createdAt: string;
}

export interface RtoTimePayload {
  pieceId?: string;
  station?: IndustrialStation;
  eventType: string;
  active: boolean;
  createdAt: string;
}

export interface RtoAlertPayload extends SupervisorAlertItem {
  source: 'alerts-engine' | 'heartbeat' | 'gateway';
  alertCode?: string;
}

export interface RtoChatPayload {
  id: string;
  conversationId: string;
  author: string;
  body: string;
  createdAt: string;
  scope: 'station' | 'piece' | 'project' | 'supervisor';
  scopeId: string;
  eventAttachment?: string;
  typing?: boolean;
  readBy?: string[];
}

export interface RtoHeartbeatPayload {
  station: IndustrialStation;
  online: boolean;
  lastSeenAt: string;
  previousOnline?: boolean;
}

export type ThreeSyncAction = 'moved' | 'completed' | 'rejected' | 'rework';

export interface RtoThreeSyncPayload {
  action: ThreeSyncAction;
  pieceId: string;
  station?: IndustrialStation;
  taskId?: string;
  timestamp: string;
}

export interface RtoBroadcastEnvelope {
  type: string;
  payload: Record<string, unknown>;
}
