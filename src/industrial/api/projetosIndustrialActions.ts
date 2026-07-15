import {
  fetchWorkOrders,
  fetchPieceWorkOrderTasks,
  startTask,
  finishTask,
} from '@/industrial/api/workOrderActions';
import { resolvePieceTracking } from '@/industrial/tracking/resolvePieceTracking';
import { updatePieceOperationState } from '@/industrial/api/pieceActions';
import { loadPieceOperations } from '@/industrial/persistence/piece/savePieceOperations';
import type { IndustrialWorkOrder } from '@/industrial/work-orders/types';
import type { TrackingSnapshot } from '@/industrial/core/tracking/types';
import type { PieceOperation } from '@/industrial/core/piece-operations/types';

import type { ProjetosPieceOperationId } from '../integration/projetos/types';

export { generateWorkOrdersFromProjetosRecord } from '@/industrial/work-orders/generateWorkOrdersFromProjetosRecord';

export async function fetchProjetosProjectWorkOrders(projectId: string): Promise<IndustrialWorkOrder[]> {
  return fetchWorkOrders({ projectId });
}

export type ProjetosIndustrialSummary = {
  orders: IndustrialWorkOrder[];
  totalTasks: number;
  completedTasks: number;
  progressPct: number;
  status: 'pending' | 'in_progress' | 'completed' | 'mixed';
};

export async function fetchProjetosIndustrialSummary(projectId: string): Promise<ProjetosIndustrialSummary> {
  const orders = await fetchProjetosProjectWorkOrders(projectId);
  let totalTasks = 0;
  let completedTasks = 0;
  for (const order of orders) {
    totalTasks += order.pieceIds.length;
    if (order.status === 'completed') completedTasks += order.pieceIds.length;
    else if (order.status === 'in_progress') completedTasks += Math.floor(order.pieceIds.length / 2);
  }
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  let status: ProjetosIndustrialSummary['status'] = 'pending';
  if (orders.length === 0) status = 'pending';
  else if (orders.every((o) => o.status === 'completed')) status = 'completed';
  else if (orders.some((o) => o.status === 'in_progress')) status = 'in_progress';
  else status = 'mixed';

  return { orders, totalTasks, completedTasks, progressPct, status };
}

export async function fetchProjetosPieceIndustrialState(pieceId: string) {
  const [tasks, tracking, operationRows] = await Promise.all([
    fetchPieceWorkOrderTasks(pieceId),
    resolvePieceTracking(pieceId),
    loadPieceOperations(pieceId).catch(() => []),
  ]);
  return { tasks, tracking: tracking as TrackingSnapshot | null, operations: operationRows };
}

const OP_TO_STATION: Partial<Record<ProjetosPieceOperationId, string>> = {
  nesting: 'nesting',
  drill: 'drill',
  orlar: 'orlar',
  montagem: 'montagem',
  embalagem: 'embalagem',
  limpeza: 'embalagem',
  manual: 'warehouse',
  cnc: 'nesting',
};

export async function recordProjetosPieceOperation(
  pieceId: string,
  operationId: ProjetosPieceOperationId,
  action: 'start' | 'complete',
  operatorId?: string
) {
  const tasks = await fetchPieceWorkOrderTasks(pieceId);
  const station = OP_TO_STATION[operationId] ?? operationId;
  const task = tasks.find((t) => t.operationType === station || t.operationType === operationId);

  if (task) {
    if (action === 'start') return startTask(task.id, operatorId);
    return finishTask(task.id, operatorId);
  }

  const operations = await loadPieceOperations(pieceId).catch(() => []);
  const match = operations.find((op) => op.operationId.includes(operationId));
  const operation: PieceOperation = match
    ? {
        id: match.operationId,
        pieceId,
        type: operationId === 'limpeza' ? 'limpeza' : (operationId as PieceOperation['type']),
        status: match.status === 'done' ? 'done' : match.status === 'running' ? 'running' : 'queued',
      }
    : {
    id: `${pieceId}:${operationId}`,
    pieceId,
    type: operationId === 'limpeza' ? 'limpeza' : (operationId as PieceOperation['type']),
        status: 'queued',
      };

  return updatePieceOperationState(
    pieceId,
    operation,
    action === 'start' ? 'start' : 'finish',
    { userId: operatorId }
  );
}
