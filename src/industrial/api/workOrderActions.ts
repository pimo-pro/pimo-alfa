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
import { resolveIndustrialUserId } from '@/industrial/persistence/users/getOrCreateIndustrialUser';
import {
  notifyWorkOrderSyncError,
  validateWorkOrderBeforeEvent,
  WORK_ORDER_SYNC_ERROR_MESSAGE,
} from '@/industrial/persistence/work-orders/validateWorkOrderBeforeEvent';
import {
  assignTaskOperator,
  syncWorkOrderStatusFromTasks,
  syncWorkOrdersStatusFromTasks,
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

/** Concorrência máxima no processamento em lote (Iniciar / Concluir / Rejeitar). */
const BULK_CONCURRENCY = 6;

export type TaskActionOptions = {
  station?: string;
  skipWorkOrderSync?: boolean;
  /** Já resolvido — evita SELECT users repetido. */
  resolvedUserId?: string;
};

export type BulkTaskResult = {
  ok: IndustrialWorkOrderTask[];
  failures: Array<{ taskId: string; pieceId?: string; error: string }>;
};

type ApplyOptions = TaskActionOptions & {
  stationEventType?: string;
  stationEventMetadata?: Record<string, unknown>;
};

export async function generateProjectWorkOrders(projectId: string) {
  return createWorkOrdersForProject(projectId);
}

export async function fetchWorkOrders(filters?: {
  projectId?: string;
  projectCode?: string;
  station?: IndustrialStation;
}) {
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
  industrialUserId: string,
  reason?: string,
) {
  const validation = await validateWorkOrderBeforeEvent(
    task.workOrderId,
    `syncPiece:task=${task.id}:piece=${task.pieceId}`,
  );
  if (!validation.ok) {
    notifyWorkOrderSyncError();
    throw new Error(validation.message ?? WORK_ORDER_SYNC_ERROR_MESSAGE);
  }

  const validatedWorkOrderId = validation.workOrderId!;
  const workOrderContext = { workOrderId: validatedWorkOrderId };
  const pieceOperation = await resolvePieceOperation(task.pieceId, task.operationType);

  if (pieceOperation) {
    if (action === 'start') {
      await updatePieceOperationState(task.pieceId, pieceOperation, 'start', {
        ...workOrderContext,
        userId: industrialUserId,
      });
      await updatePieceTime(
        task.pieceId,
        {
          operationId: pieceOperation.id,
          userId: industrialUserId,
          stationId: pieceOperation.type,
        },
        'start',
        { ...workOrderContext, userId: industrialUserId },
      );
    } else if (action === 'complete') {
      await updatePieceOperationState(task.pieceId, pieceOperation, 'finish', {
        ...workOrderContext,
        userId: industrialUserId,
      });
      await updatePieceTime(
        task.pieceId,
        { operationId: pieceOperation.id, userId: industrialUserId },
        'stop',
        { ...workOrderContext, userId: industrialUserId },
      );
    } else if (action === 'reject') {
      await updatePieceOperationState(task.pieceId, pieceOperation, 'reject', {
        ...workOrderContext,
        userId: industrialUserId,
        reason,
      });
    }
  }

  if (action === 'complete' && (task.operationType === 'embalagem' || task.operationType === 'montagem')) {
    await updatePieceQuality(task.pieceId, 'approved', {
      inspectorId: industrialUserId,
      ...workOrderContext,
      notes: `Aprovação automática na estação ${task.operationType}`,
    });
  }

  await logPieceEventAction(task.pieceId, {
    type: `work_order_task_${action}`,
    workOrderId: validatedWorkOrderId,
    userId: industrialUserId,
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
  options: ApplyOptions = {},
) {
  const industrialUserId =
    options.resolvedUserId ?? (await resolveIndustrialUserId(operatorId));

  const updated = await updateTaskState({
    taskId: task.id,
    status,
    operatorId: industrialUserId,
    reason,
  });

  await logWorkOrderEvent({
    workOrderId: task.workOrderId,
    taskId: task.id,
    eventType: `task_${action}`,
    operatorId: industrialUserId,
    metadata: { pieceId: task.pieceId, operationType: task.operationType, reason },
  });

  // Evento de estação no mesmo fluxo (evita logTaskEvent extra + requireTask).
  if (options.stationEventType) {
    await logWorkOrderEvent({
      workOrderId: task.workOrderId,
      taskId: task.id,
      eventType: options.stationEventType,
      operatorId: industrialUserId,
      metadata: {
        pieceId: task.pieceId,
        operationType: task.operationType,
        ...(options.stationEventMetadata ?? {}),
      },
    });
  }

  await syncPieceOnTaskAction(task, action, industrialUserId, reason);

  if (!options.skipWorkOrderSync && task.workOrderId) {
    await syncWorkOrderStatusFromTasks(task.workOrderId);
  }
  return updated;
}

function stationApplyOptions(
  options: TaskActionOptions | undefined,
  stationEventType: string,
): ApplyOptions {
  return {
    skipWorkOrderSync: options?.skipWorkOrderSync,
    resolvedUserId: options?.resolvedUserId,
    stationEventType: options?.station ? stationEventType : undefined,
    stationEventMetadata: options?.station
      ? { station: options.station, bulk: true }
      : undefined,
  };
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  if (items.length === 0) return [];
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      try {
        const value = await worker(items[index]!);
        results[index] = { status: 'fulfilled', value };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(runners);
  return results;
}

function collectBulkResult(
  taskIds: string[],
  settled: PromiseSettledResult<IndustrialWorkOrderTask>[],
  pieceIdByTaskId?: Map<string, string>,
): BulkTaskResult {
  const ok: IndustrialWorkOrderTask[] = [];
  const failures: BulkTaskResult['failures'] = [];

  settled.forEach((result, index) => {
    const taskId = taskIds[index]!;
    if (result.status === 'fulfilled') {
      ok.push(result.value);
      return;
    }
    const msg = result.reason instanceof Error ? result.reason.message : 'Falha';
    failures.push({
      taskId,
      pieceId: pieceIdByTaskId?.get(taskId),
      error: msg,
    });
  });

  return { ok, failures };
}

export async function startTask(
  taskId: string,
  operatorId?: string,
  options?: TaskActionOptions,
) {
  const task = await requireTask(taskId);
  if (task.status !== 'pending') {
    throw new Error('Apenas tarefas pendentes podem ser iniciadas.');
  }
  const industrialUserId =
    options?.resolvedUserId ?? (await resolveIndustrialUserId(operatorId));
  return applyTaskStatus(
    task,
    'in_progress',
    'start',
    industrialUserId,
    undefined,
    {
      ...stationApplyOptions({ ...options, resolvedUserId: industrialUserId }, 'station_started'),
    },
  );
}

export async function finishTask(
  taskId: string,
  operatorId?: string,
  options?: TaskActionOptions,
) {
  const task = await requireTask(taskId);
  if (task.status === 'completed' || task.status === 'rejected') {
    throw new Error('Tarefa já finalizada.');
  }

  const industrialUserId =
    options?.resolvedUserId ?? (await resolveIndustrialUserId(operatorId));
  const applyOpts = stationApplyOptions(
    { ...options, resolvedUserId: industrialUserId },
    'station_confirmed',
  );

  if (task.status === 'pending') {
    await applyTaskStatus(task, 'in_progress', 'start', industrialUserId, undefined, {
      ...applyOpts,
      skipWorkOrderSync: true,
      stationEventType: undefined,
      stationEventMetadata: undefined,
    });
  }

  const current = task.status === 'pending' ? await requireTask(taskId) : task;
  return applyTaskStatus(current, 'completed', 'complete', industrialUserId, undefined, applyOpts);
}

export async function rejectTask(
  taskId: string,
  reason?: string,
  operatorId?: string,
  options?: TaskActionOptions,
) {
  const task = await requireTask(taskId);
  if (task.status === 'completed' || task.status === 'rejected') {
    throw new Error('Tarefa já finalizada.');
  }
  const industrialUserId =
    options?.resolvedUserId ?? (await resolveIndustrialUserId(operatorId));
  return applyTaskStatus(
    task,
    'rejected',
    'reject',
    industrialUserId,
    reason,
    stationApplyOptions({ ...options, resolvedUserId: industrialUserId }, 'station_rejected'),
  );
}

export async function startTasks(
  taskIds: string[],
  operatorId?: string,
  options?: { station?: string; concurrency?: number },
): Promise<BulkTaskResult> {
  if (taskIds.length === 0) return { ok: [], failures: [] };

  const industrialUserId = await resolveIndustrialUserId(operatorId);
  const concurrency = options?.concurrency ?? BULK_CONCURRENCY;
  const pieceIdByTaskId = new Map<string, string>();

  const settled = await mapPool(taskIds, concurrency, async (taskId) => {
    const updated = await startTask(taskId, industrialUserId, {
      station: options?.station,
      skipWorkOrderSync: true,
      resolvedUserId: industrialUserId,
    });
    pieceIdByTaskId.set(taskId, updated.pieceId);
    return updated;
  });

  const result = collectBulkResult(taskIds, settled, pieceIdByTaskId);
  const touchedOrders = Array.from(
    new Set(result.ok.map((task) => task.workOrderId).filter(Boolean)),
  );
  await syncWorkOrdersStatusFromTasks(touchedOrders);
  return result;
}

export async function finishTasks(
  taskIds: string[],
  operatorId?: string,
  options?: { station?: string; concurrency?: number },
): Promise<BulkTaskResult> {
  if (taskIds.length === 0) return { ok: [], failures: [] };

  const industrialUserId = await resolveIndustrialUserId(operatorId);
  const concurrency = options?.concurrency ?? BULK_CONCURRENCY;
  const pieceIdByTaskId = new Map<string, string>();

  const settled = await mapPool(taskIds, concurrency, async (taskId) => {
    const updated = await finishTask(taskId, industrialUserId, {
      station: options?.station,
      skipWorkOrderSync: true,
      resolvedUserId: industrialUserId,
    });
    pieceIdByTaskId.set(taskId, updated.pieceId);
    return updated;
  });

  const result = collectBulkResult(taskIds, settled, pieceIdByTaskId);
  const touchedOrders = Array.from(
    new Set(result.ok.map((task) => task.workOrderId).filter(Boolean)),
  );
  await syncWorkOrdersStatusFromTasks(touchedOrders);
  return result;
}

export async function rejectTasks(
  taskIds: string[],
  reason?: string,
  operatorId?: string,
  options?: { station?: string; concurrency?: number },
): Promise<BulkTaskResult> {
  if (taskIds.length === 0) return { ok: [], failures: [] };

  const industrialUserId = await resolveIndustrialUserId(operatorId);
  const concurrency = options?.concurrency ?? BULK_CONCURRENCY;
  const pieceIdByTaskId = new Map<string, string>();

  const settled = await mapPool(taskIds, concurrency, async (taskId) => {
    const updated = await rejectTask(taskId, reason, industrialUserId, {
      station: options?.station,
      skipWorkOrderSync: true,
      resolvedUserId: industrialUserId,
    });
    pieceIdByTaskId.set(taskId, updated.pieceId);
    return updated;
  });

  const result = collectBulkResult(taskIds, settled, pieceIdByTaskId);
  const touchedOrders = Array.from(
    new Set(result.ok.map((task) => task.workOrderId).filter(Boolean)),
  );
  await syncWorkOrdersStatusFromTasks(touchedOrders);
  return result;
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
