import type { WorkOrder as LegacyWorkflowWorkOrder } from '@/industrial/core/work-orders/types';

import type {
  IndustrialStation,
  IndustrialWorkOrder,
  StationWorkOrderStatus,
  WorkflowWorkOrderExtension,
} from '../WorkOrder';

const LEGACY_TO_STATION_STATUS: Record<string, StationWorkOrderStatus> = {
  draft: 'pending',
  pending_approval: 'pending',
  approved: 'pending',
  in_progress: 'in_progress',
  paused: 'in_progress',
  quality_review: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
  pending: 'pending',
};

/**
 * Ponte read-only: `work_orders` (legado) → vista parcial de `IndustrialWorkOrder`.
 * Não usar para persistência de produção por estação.
 */
export function legacyWorkflowWorkOrderToIndustrialView(
  legacy: LegacyWorkflowWorkOrder,
  options: {
    projectId?: string;
    station?: IndustrialStation;
  } = {},
): Pick<IndustrialWorkOrder, 'id' | 'projectId' | 'station' | 'status' | 'metadata' | 'createdAt' | 'updatedAt'> &
  WorkflowWorkOrderExtension & { pieceIds: string[]; operationTypes: string[] } {
  const station = options.station ?? 'warehouse';
  const status = LEGACY_TO_STATION_STATUS[legacy.status] ?? 'pending';

  return {
    id: legacy.id,
    projectId: options.projectId ?? String(legacy.metadata?.projectId ?? ''),
    station,
    status,
    pieceIds: [],
    operationTypes: [],
    metadata: {
      ...legacy.metadata,
      legacySource: 'work_orders',
      legacyTitle: legacy.title,
      legacyStatus: legacy.status,
    },
    createdAt: legacy.created_at,
    updatedAt: legacy.updated_at,
    orderNumber: legacy.order_number,
    title: legacy.title,
    description: legacy.description,
    priority: legacy.priority ?? null,
    departmentId: legacy.department_id,
    assignedTo: legacy.assigned_to,
    createdBy: legacy.created_by,
    dueDate: legacy.due_date,
    completedAt: legacy.completed_at,
  };
}

/**
 * Extrai extensão workflow sem converter para modelo de estação.
 */
export function extractWorkflowExtension(legacy: LegacyWorkflowWorkOrder): WorkflowWorkOrderExtension {
  return {
    orderNumber: legacy.order_number,
    title: legacy.title,
    description: legacy.description,
    priority: legacy.priority ?? null,
    departmentId: legacy.department_id,
    assignedTo: legacy.assigned_to,
    createdBy: legacy.created_by,
    dueDate: legacy.due_date,
    completedAt: legacy.completed_at,
  };
}
