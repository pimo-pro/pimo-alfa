import { getTasksByWorkOrder } from '../core/tasks/actions';
import { getWorkOrderById } from '../core/work-orders/actions';
import type { TrackingSnapshot } from '../core/tracking/types';
import {
  loadTasksByWorkOrder,
  loadWorkOrderById,
} from '../persistence/work-orders/loadWorkOrders';

import { buildTrackingSnapshot } from './buildTrackingSnapshot';

/** Lê progresso de WO a partir de `industrial_work_orders*`. */
export async function getWorkOrderTrackingIndustrial(
  workOrderId: string,
): Promise<TrackingSnapshot | null> {
  const workOrder = await loadWorkOrderById(workOrderId);
  if (!workOrder) return null;

  const tasks = await loadTasksByWorkOrder(workOrderId);
  return buildTrackingSnapshot(workOrderId, workOrder.status, tasks, workOrder.updatedAt);
}

/** Fallback legado — `work_orders` / `work_order_tasks`. */
export async function getWorkOrderTrackingLegacy(
  workOrderId: string,
): Promise<TrackingSnapshot | null> {
  const workOrder = await getWorkOrderById(workOrderId);
  if (!workOrder) return null;

  const tasks = await getTasksByWorkOrder(workOrderId);
  return buildTrackingSnapshot(
    workOrderId,
    workOrder.status,
    tasks,
    workOrder.updated_at,
  );
}

/**
 * Tracking unificado: tenta tabelas industriais primeiro; fallback legado.
 * Mantém forma `TrackingSnapshot` para compatibilidade com UI existente.
 */
export async function getWorkOrderTrackingUnified(
  workOrderId: string,
): Promise<TrackingSnapshot | null> {
  const industrial = await getWorkOrderTrackingIndustrial(workOrderId);
  if (industrial) return industrial;
  return getWorkOrderTrackingLegacy(workOrderId);
}
