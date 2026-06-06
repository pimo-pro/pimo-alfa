import { createWorkOrdersForProject } from '@/industrial/work-orders/createWorkOrdersForProject';
import type { IndustrialStation, WorkOrderTaskStatus } from '@/industrial/work-orders/types';
import {
  loadTaskById,
  loadTasksByPiece,
  loadTasksByStation,
  loadTasksByWorkOrder,
  loadWorkOrderById,
  loadWorkOrders,
} from '@/industrial/persistence/work-orders/loadWorkOrders';
import { logWorkOrderEvent } from '@/industrial/persistence/work-orders/logWorkOrderEvent';
import {
  assignTaskOperator,
  syncWorkOrderStatusFromTasks,
  updateTaskState,
} from '@/industrial/persistence/work-orders/updateTaskState';
import {
  loadPieceOperations,
  logPieceEventAction,
  updatePieceOperationState,
  updatePieceQuality,
  updatePieceTime,
} from '@/industrial/api/pieceActions';
import type { PieceOperation, PieceOperationType } from '@/industrial/core/piece-operations/types';
import type { IndustrialWorkOrderTask } from '@/industrial/work-orders/types';

export async function generateProjectWorkOrders(projectId: string) {
  return createWorkOrdersForProject(projectId);
}

export async function fetchWorkOrders(filters?: { projectId?: string; station?: IndustrialStation }) {
  return loadWorkOrders(filters);
}

export async function fetchWorkOrderDetail(workOrderId: string) {
  const [order, tasks] = await Promise.all([
    loadWorkOrderById(workOrderId),
    loadTasksByWorkOrder(workOrderId),
  ]);
  return { order, tasks };
}

export async function fetchStationTasks(station: IndustrialStation) {
  return loadTasksByStation(station);
}

export async function fetchPieceWorkOrderTasks(pieceId: string) {
  return loadTasksByPiece(pieceId);
}

const PIECE_OPERATION_TYPES = new Set<PieceOperationType>([
  'nesting',
  'cnc',
  'drill',
  'orlar',
  'montagem',
  'embalagem',
  'limpeza',
]);

function isPieceOperationType(value: string): value is PieceOperationType {
  return PIECE_OPERATION_TYPES.has(value as PieceOperationType);
}

async function resolvePieceOperation(pieceId: string, operationType: string): Promise<PieceOperation | null> {
  if (!isPieceOperationType(operationType)) return null;

  const persisted = await loadPieceOperations(pieceId);
  const match = persisted.find((row) => row.operationId.includes(operationType));
  if (match) {
    return {
      id: match.operationId,
      pieceId,
      type: operationType,
      status: match.status,
    };
  }

  return {
    id: `${pieceId}:${operationType}`,
    pieceId,
    type: operationType,
    status: 'queued',
  };
}

async function requireTask(taskId: string): Promise<IndustrialWorkOrderTask> {
  const task = await loadTaskById(taskId);
  if (!task) throw new Error(`Tarefa não encontrada: ${taskId}`);
  return task;
}

async function syncPieceOnTaskAction(
  task: IndustrialWorkOrderTask,
  action: 'start' | 'complete' | 'reject',
  operatorId?: string,
  reason?: string,
) {
  const pieceOperation = await resolvePieceOperation(task.pieceId, task.operationType);

  if (pieceOperation) {
    if (action === 'start') {
      await updatePieceOperationState(task.pieceId, pieceOperation, 'start', {
        workOrderId: task.workOrderId,
        userId: operatorId,
      });
      await updatePieceTime(
        task.pieceId,
        {
          operationId: pieceOperation.id,
          userId: operatorId ?? 'operator',
          stationId: pieceOperation.type,
        },
        'start',
        { workOrderId: task.workOrderId, userId: operatorId },
      );
    } else if (action === 'complete') {
      await updatePieceOperationState(task.pieceId, pieceOperation, 'finish', {
        workOrderId: task.workOrderId,
        userId: operatorId,
      });
      await updatePieceTime(
        task.pieceId,
        { operationId: pieceOperation.id, userId: operatorId ?? 'operator' },
        'stop',
        { workOrderId: task.workOrderId, userId: operatorId },
      );
    } else if (action === 'reject') {
      await updatePieceOperationState(task.pieceId, pieceOperation, 'reject', {
        workOrderId: task.workOrderId,
        userId: operatorId,
        reason,
      });
    }
  }

  if (action === 'complete' && (task.operationType === 'embalagem' || task.operationType === 'montagem')) {
    await updatePieceQuality(task.pieceId, 'approved', {
      inspectorId: operatorId,
      workOrderId: task.workOrderId,
      notes: `Aprovação automática na estação ${task.operationType}`,
    });
  }

  await logPieceEventAction(task.pieceId, {
    type: `work_order_task_${action}`,
    workOrderId: task.workOrderId,
    userId: operatorId,
    metadata: {
      taskId: task.id,
      operationType: task.operationType,
      station: task.operationType,
      reason,
    },
  });
}

async function applyTaskStatus(
  task: IndustrialWorkOrderTask,
  status: WorkOrderTaskStatus,
  action: 'start' | 'complete' | 'reject',
  operatorId?: string,
  reason?: string,
) {
  const updated = await updateTaskState({
    taskId: task.id,
    status,
    operatorId,
    reason,
  });

  await logWorkOrderEvent({
    workOrderId: task.workOrderId,
    taskId: task.id,
    eventType: `task_${action}`,
    operatorId,
    metadata: { pieceId: task.pieceId, operationType: task.operationType, reason },
  });

  await syncPieceOnTaskAction(task, action, operatorId, reason);
  await syncWorkOrderStatusFromTasks(task.workOrderId);
  return updated;
}

export async function startTask(taskId: string, operatorId?: string) {
  const task = await requireTask(taskId);
  if (task.status !== 'pending') {
    throw new Error('Apenas tarefas pendentes podem ser iniciadas.');
  }
  if (operatorId) await assignTaskOperator(taskId, operatorId);
  return applyTaskStatus(task, 'in_progress', 'start', operatorId);
}

export async function finishTask(taskId: string, operatorId?: string) {
  const task = await requireTask(taskId);
  if (task.status === 'completed' || task.status === 'rejected') {
    throw new Error('Tarefa já finalizada.');
  }
  if (task.status === 'pending') {
    await applyTaskStatus(task, 'in_progress', 'start', operatorId);
  }
  const current = await requireTask(taskId);
  if (operatorId) await assignTaskOperator(taskId, operatorId);
  return applyTaskStatus(current, 'completed', 'complete', operatorId);
}

export async function rejectTask(taskId: string, reason?: string, operatorId?: string) {
  const task = await requireTask(taskId);
  if (task.status === 'completed' || task.status === 'rejected') {
    throw new Error('Tarefa já finalizada.');
  }
  if (operatorId) await assignTaskOperator(taskId, operatorId);
  return applyTaskStatus(task, 'rejected', 'reject', operatorId, reason);
}

export async function logTaskEvent(
  taskId: string,
  event: string,
  metadata?: Record<string, unknown>,
  operatorId?: string,
) {
  const task = await requireTask(taskId);
  return logWorkOrderEvent({
    workOrderId: task.workOrderId,
    taskId: task.id,
    eventType: event,
    operatorId,
    metadata: { pieceId: task.pieceId, operationType: task.operationType, ...metadata },
  });
}

export async function assignOperator(taskId: string, operatorId: string) {
  const task = await assignTaskOperator(taskId, operatorId);
  await logTaskEvent(taskId, 'operator_assigned', { operatorId }, operatorId);
  return task;
}

export interface ExecuteTaskInput {
  taskId: string;
  workOrderId: string;
  pieceId: string;
  operationType: string;
  action: 'start' | 'complete' | 'reject';
  operatorId?: string;
  reason?: string;
}

/** @deprecated Preferir startTask / finishTask / rejectTask */
export async function executeWorkOrderTask(input: ExecuteTaskInput) {
  if (input.action === 'start') return startTask(input.taskId, input.operatorId);
  if (input.action === 'complete') return finishTask(input.taskId, input.operatorId);
  return rejectTask(input.taskId, input.reason, input.operatorId);
}
