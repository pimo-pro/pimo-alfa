import type {
  IndustrialStation,
  IndustrialWorkOrder,
  IndustrialWorkOrderEvent,
  IndustrialWorkOrderTask,
  WorkOrderStatus,
  WorkOrderTaskStatus,
} from '@/industrial/work-orders/types';

interface WorkOrderRow {
  id: string;
  project_id: string;
  station: string;
  status: string;
  piece_ids: unknown;
  operation_types: unknown;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface TaskRow {
  id: string;
  work_order_id: string;
  piece_id: string;
  operation_type: string;
  status: string;
  operator_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  rejected_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface EventRow {
  id: string;
  work_order_id: string | null;
  task_id: string | null;
  event_type: string;
  operator_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function mapWorkOrderRow(row: WorkOrderRow): IndustrialWorkOrder {
  return {
    id: row.id,
    projectId: row.project_id,
    station: row.station as IndustrialStation,
    status: row.status as WorkOrderStatus,
    pieceIds: asStringArray(row.piece_ids),
    operationTypes: asStringArray(row.operation_types),
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTaskRow(row: TaskRow): IndustrialWorkOrderTask {
  return {
    id: row.id,
    workOrderId: row.work_order_id,
    pieceId: row.piece_id,
    operationType: row.operation_type,
    status: row.status as WorkOrderTaskStatus,
    operatorId: row.operator_id ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    rejectedAt: row.rejected_at ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEventRow(row: EventRow): IndustrialWorkOrderEvent {
  return {
    id: row.id,
    workOrderId: row.work_order_id ?? undefined,
    taskId: row.task_id ?? undefined,
    eventType: row.event_type,
    operatorId: row.operator_id ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}
