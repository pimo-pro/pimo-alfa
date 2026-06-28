import {
  fetchProjetosPieceIndustrialState,
  recordProjetosPieceOperation,
} from '@/industrial/api/projetosIndustrialActions';
import { logWorkOrderEvent } from '@/industrial/persistence/work-orders/logWorkOrderEvent';
import {
  loadTasksByOperator,
  loadTasksByWorkOrder,
  loadWorkOrderEvents,
  loadWorkOrders,
} from '@/industrial/persistence/work-orders/loadWorkOrders';
import { mapEventRow } from '@/industrial/persistence/work-orders/mappers';
import type { ProjetosPieceOperationId } from '@/industrial/integration/projetos/types';
import type { IndustrialWorkOrder, IndustrialWorkOrderTask } from '@/industrial/work-orders/types';

import { OPERATOR_SESSION_FREE } from '../operador/constants';
import { resolveTaskForOperation } from '../operador/operationMapping';
import {
  resolvePieceByCode,
  resolvePieceByCodeAsync,
  resolvePiecesByCodes,
} from '../operador/resolvePieceByCode';
import type {
  OperatorOperationLogEntry,
  OperatorPieceState,
  RecordOperatorOperationInput,
} from '../operador/types';

export { resolvePieceByCode, resolvePieceByCodeAsync, resolvePiecesByCodes };

export type OperatorWorkOrderSummary = {
  order: IndustrialWorkOrder;
  tasks: IndustrialWorkOrderTask[];
  pendingCount: number;
  pieceCount: number;
};

export type OperatorIndustrialMessage = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  assignedOperatorId?: string | null;
  workOrderId?: string;
  pieceId?: string;
  eventType?: string;
};

export async function fetchOperatorPieceState(pieceId: string): Promise<OperatorPieceState | null> {
  const lookup = resolvePieceByCode(pieceId) ?? (await resolvePieceByCodeAsync(pieceId)) ?? {
    pieceId,
    projectId: '',
    projectName: '—',
  };

  const industrial = await fetchProjetosPieceIndustrialState(pieceId);

  return {
    ...lookup,
    pieceId,
    tasks: industrial.tasks,
    tracking: industrial.tracking,
    operations: industrial.operations,
  };
}

export async function fetchOperatorPiecesState(pieceIds: string[]): Promise<OperatorPieceState[]> {
  const unique = Array.from(new Set(pieceIds.filter(Boolean)));
  const results = await Promise.all(unique.map((id) => fetchOperatorPieceState(id)));
  return results.filter((row): row is OperatorPieceState => row !== null);
}

export async function fetchOperatorWorkOrderSummaries(
  operatorId?: string,
): Promise<OperatorWorkOrderSummary[]> {
  const [orders, tasks] = await Promise.all([
    loadWorkOrders(),
    loadTasksByOperator(operatorId),
  ]);

  const tasksByOrder = new Map<string, IndustrialWorkOrderTask[]>();
  for (const task of tasks) {
    const list = tasksByOrder.get(task.workOrderId) ?? [];
    list.push(task);
    tasksByOrder.set(task.workOrderId, list);
  }

  const relevantOrderIds = new Set(tasks.map((t) => t.workOrderId));
  const scopedOrders = orders.filter(
    (order) =>
      relevantOrderIds.has(order.id) &&
      (order.status === 'pending' || order.status === 'in_progress'),
  );

  return scopedOrders.map((order) => {
    const orderTasks = tasksByOrder.get(order.id) ?? [];
    const pieceIds = Array.from(new Set(orderTasks.map((t) => t.pieceId)));
    return {
      order,
      tasks: orderTasks,
      pendingCount: orderTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length,
      pieceCount: pieceIds.length,
    };
  });
}

export async function fetchWorkOrderPieceIds(workOrderId: string): Promise<string[]> {
  const tasks = await loadTasksByWorkOrder(workOrderId);
  return Array.from(new Set(tasks.map((t) => t.pieceId)));
}

export async function fetchOperatorMessages(
  operatorId?: string,
  pieceIds: string[] = [],
): Promise<OperatorIndustrialMessage[]> {
  const events = await loadWorkOrderEvents({ operatorId, limit: 60 });
  const mapped = events.map(mapEventRow);

  const pieceSet = new Set(pieceIds);
  const filtered =
    pieceIds.length > 0
      ? mapped.filter((event) => {
          const metaPiece = typeof event.metadata?.pieceId === 'string' ? event.metadata.pieceId : null;
          return metaPiece ? pieceSet.has(metaPiece) : true;
        })
      : mapped;

  return filtered.slice(0, 30).map((event) => {
    const pieceId =
      typeof event.metadata?.pieceId === 'string' ? event.metadata.pieceId : undefined;
    const operationType =
      typeof event.metadata?.operationType === 'string' ? event.metadata.operationType : undefined;
    const nqrCode =
      typeof event.metadata?.nqrCode === 'string' ? event.metadata.nqrCode : undefined;

    return {
      id: event.id,
      title: event.eventType.replace(/_/g, ' ').toUpperCase(),
      body: [
        pieceId ? `Peça: ${nqrCode ?? pieceId}` : null,
        operationType ? `Operação: ${operationType}` : null,
        event.workOrderId ? `WO: ${event.workOrderId.slice(0, 8)}…` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      createdAt: event.createdAt,
      assignedOperatorId: event.operatorId ?? null,
      workOrderId: event.workOrderId,
      pieceId,
      eventType: event.eventType,
    };
  });
}

function buildLogEntry(
  pieceId: string,
  operationType: ProjetosPieceOperationId,
  action: 'start' | 'complete',
  operatorSession: string,
  workOrderId?: string,
  nqrCode?: string | null,
  notes?: string,
): OperatorOperationLogEntry {
  return {
    id: `${Date.now()}-${pieceId}-${operationType}-${action}`,
    pieceId,
    nqrCode,
    operationType,
    action,
    operatorSession,
    workOrderId,
    notes,
    timestamp: new Date().toISOString(),
  };
}

export async function recordOperatorOperation(
  input: RecordOperatorOperationInput,
): Promise<OperatorOperationLogEntry[]> {
  const {
    pieceIds,
    operationType,
    action,
    operatorId,
    operatorSession = OPERATOR_SESSION_FREE,
    notes,
  } = input;

  const logs: OperatorOperationLogEntry[] = [];

  for (const pieceId of pieceIds) {
    const lookup = resolvePieceByCode(pieceId) ?? (await resolvePieceByCodeAsync(pieceId));
    const state = await fetchProjetosPieceIndustrialState(pieceId);
    const task = resolveTaskForOperation(state.tasks, operationType);

    await recordProjetosPieceOperation(pieceId, operationType, action, operatorId);

    await logWorkOrderEvent({
      workOrderId: task?.workOrderId,
      taskId: task?.id,
      eventType: action === 'start' ? 'operator_operation_started' : 'operator_operation_completed',
      operatorId,
      metadata: {
        pieceId,
        nqrCode: lookup?.etiquetaCode ?? null,
        operationType,
        operatorSession,
        notes: notes ?? null,
        source: 'operator_page',
      },
    });

    logs.push(
      buildLogEntry(
        pieceId,
        operationType,
        action,
        operatorSession,
        task?.workOrderId,
        lookup?.etiquetaCode,
        notes,
      ),
    );
  }

  return logs;
}

export async function resolveAndLoadPieceByCode(rawCode: string): Promise<OperatorPieceState | null> {
  const lookup = (await resolvePieceByCodeAsync(rawCode)) ?? resolvePieceByCode(rawCode);
  if (!lookup) return null;
  return fetchOperatorPieceState(lookup.pieceId);
}

export async function resolveAndLoadPiecesByCodes(rawCodes: string[]): Promise<OperatorPieceState[]> {
  const lookups = resolvePiecesByCodes(rawCodes);

  for (const raw of rawCodes) {
    const parts = raw.split(/[\n,;|\t]+/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts.length > 0 ? parts : [raw]) {
      if (resolvePieceByCode(part)) continue;
      const asyncLookup = await resolvePieceByCodeAsync(part);
      if (asyncLookup && !lookups.some((l) => l.pieceId === asyncLookup.pieceId)) {
        lookups.push(asyncLookup);
      }
    }
  }

  return fetchOperatorPiecesState(lookups.map((row) => row.pieceId));
}
