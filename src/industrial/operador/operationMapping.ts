import type { ProjetosPieceOperationId } from '@/industrial/integration/projetos/types';
import type { IndustrialWorkOrderTask } from '@/industrial/work-orders/types';
import type { PieceOperationRecord } from '@/industrial/persistence/shared/types';

/** Mapeamento operação UI → estação Supabase / work order task. */
export const OPERATOR_OP_TO_STATION: Partial<Record<ProjetosPieceOperationId, string>> = {
  nesting: 'nesting',
  manual: 'warehouse',
  cnc: 'nesting',
  drill: 'drill',
  orlar: 'orlar',
  montagem: 'montagem',
  embalagem: 'embalagem',
  limpeza: 'embalagem',
};

export function resolveTaskForOperation(
  tasks: IndustrialWorkOrderTask[],
  operationType: ProjetosPieceOperationId,
): IndustrialWorkOrderTask | undefined {
  const station = OPERATOR_OP_TO_STATION[operationType] ?? operationType;
  return tasks.find(
    (task) =>
      task.operationType === station ||
      task.operationType === operationType ||
      task.operationType.includes(operationType),
  );
}

export type OperationUiStatus = 'idle' | 'queued' | 'running' | 'done';

export function resolveOperationUiStatus(
  operations: PieceOperationRecord[],
  tasks: IndustrialWorkOrderTask[],
  operationType: ProjetosPieceOperationId,
): OperationUiStatus {
  const station = OPERATOR_OP_TO_STATION[operationType] ?? operationType;
  const task = resolveTaskForOperation(tasks, operationType);

  if (task?.status === 'completed') return 'done';
  if (task?.status === 'in_progress') return 'running';
  if (task?.status === 'pending') return 'queued';

  const opRow = operations.find(
    (row) =>
      row.operationId.includes(operationType) ||
      row.operationId.includes(station),
  );
  if (!opRow) return 'idle';
  if (opRow.status === 'done') return 'done';
  if (opRow.status === 'running') return 'running';
  return 'queued';
}
