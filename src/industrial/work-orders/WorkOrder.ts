/**
 * SSOT — Work Order de produção (PIMO-TRAK estações).
 *
 * Modelo canónico: `IndustrialWorkOrder` em `industrial/work-orders/`.
 * Persistência: `industrial/persistence/work-orders/` → tabelas `industrial_work_orders*`.
 * UI activa: `app/industrial/work-orders/**`.
 *
 * Modelo legado (workflow HR): `industrial/core/work-orders/WorkOrder` → tabela `work_orders`.
 * Usar adapter `legacyWorkflowWorkOrderAdapter` para leitura pontual — não escrever WO de produção no legado.
 *
 * @see docs/adr/ADR-002-work-orders-unification.md
 */

export type {
  GeneratedWorkOrderDraft,
  IndustrialStation,
  IndustrialWorkOrder,
  IndustrialWorkOrderEvent,
  IndustrialWorkOrderTask,
  WorkOrderStatus,
  WorkOrderTaskStatus,
} from './types';

export { INDUSTRIAL_STATIONS, STATION_LABELS } from './types';

/** Alias canónico — preferir em código novo. */
export type ProductionWorkOrder = import('./types').IndustrialWorkOrder;

/** Alias canónico — tarefa de estação (peça + operação). */
export type StationWorkOrderTask = import('./types').IndustrialWorkOrderTask;

/** Status de WO por estação (não confundir com workflow-engine). */
export type StationWorkOrderStatus = import('./types').WorkOrderStatus;

/**
 * Campos de workflow legado (tabela `work_orders`) para migração futura.
 * Não persistidos em `industrial_work_orders` nesta fase.
 *
 * @deprecated Campos opcionais — preencher apenas via adapter legado.
 */
export interface WorkflowWorkOrderExtension {
  orderNumber?: string | null;
  title?: string;
  description?: string | null;
  priority?: string | null;
  departmentId?: string | null;
  assignedTo?: string | null;
  createdBy?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
}

/** WO de produção com extensão workflow (dual-read futuro). */
export type UnifiedProductionWorkOrder = import('./types').IndustrialWorkOrder & WorkflowWorkOrderExtension;
