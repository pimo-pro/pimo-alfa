import type { PieceOperationStatus } from '@/industrial/core/piece-operations/types';
import type { QualityDecision } from '@/industrial/core/quality/types';

export type PieceEntityType = 'piece' | 'remate' | 'rodape';

export interface PieceTransformRecord {
  pieceId: string;
  entityId: string;
  entityType: PieceEntityType;
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface PieceEdgeRecord {
  pieceId: string;
  entityId: string;
  entityType: PieceEntityType;
  payload: Record<string, unknown>;
}

export interface PieceOperationRecord {
  pieceId: string;
  operationId: string;
  status: PieceOperationStatus;
  payload?: Record<string, unknown>;
}

export interface PieceQualityRecord {
  pieceId: string;
  decision: QualityDecision;
  payload?: Record<string, unknown>;
}

export interface PieceTimeRecord {
  pieceId: string;
  payload: Record<string, unknown>;
}

export interface PieceRemateRecord {
  pieceId: string;
  entityId: string;
  entityType: 'remate' | 'rodape';
  payload: Record<string, unknown>;
}

export type PieceUiEventType =
  | 'piece_selected'
  | 'piece_moved'
  | 'piece_rotated'
  | 'operation_started'
  | 'operation_finished'
  | 'quality_checked'
  | 'rework_requested'
  | 'time_started'
  | 'time_stopped'
  | 'work_order_task_start'
  | 'work_order_task_complete'
  | 'work_order_task_reject';

export interface PieceEventPayload {
  type: PieceUiEventType;
  metadata?: Record<string, unknown>;
  workOrderId?: string;
  userId?: string;
}
